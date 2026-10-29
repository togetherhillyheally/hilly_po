"use client"

import { useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { FileUp, Flag, Loader2, Mountain, Route, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import TrailMapPreview from "@/components/map/TrailMapPreview"
import { useCurrentUser } from "@/hooks/use-current-user"
import {
  displayNameFromFileName,
  extractWaypoints,
  prepareTrailFromGpxText,
  type PreparedTrailGeometry,
} from "@/lib/gpx-prep"
import { checkpointRepo } from "@/lib/repos/checkpointRepo"
import { trailUploadOps } from "@/lib/repos/trailUpload"

type GpxEntry = {
  id: string
  fileName: string
  gpxText: string
  prepared: PreparedTrailGeometry
}

/** GPX 웨이포인트 → 체크포인트 후보 (이름 수정·표시 여부 선택 가능) */
type WaypointDraft = {
  key: string
  entryId: string
  name: string
  lat: number
  lon: number
  ele?: number
  show: boolean
}

export default function NewCoursePage() {
  const router = useRouter()
  const { user } = useCurrentUser()
  const [entries, setEntries] = useState<GpxEntry[]>([])
  const [waypoints, setWaypoints] = useState<WaypointDraft[]>([])
  // 웨이포인트를 체크포인트로 가져올지 (전체 스위치) — 개별 표시 여부는 각 항목 체크
  const [importWaypoints, setImportWaypoints] = useState(true)
  const [name, setName] = useState("")
  const [creating, setCreating] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const merged = useMemo(() => {
    if (entries.length === 0) return null
    const preps = entries.map((e) => e.prepared)
    const bounds = preps.reduce(
      (acc, p) => ({
        minLat: Math.min(acc.minLat, p.bounds.minLat),
        maxLat: Math.max(acc.maxLat, p.bounds.maxLat),
        minLon: Math.min(acc.minLon, p.bounds.minLon),
        maxLon: Math.max(acc.maxLon, p.bounds.maxLon),
      }),
      preps[0].bounds,
    )
    const coordinates = preps.flatMap((p) => {
      const c = p.coordinates
      const isMulti =
        c.length > 0 && Array.isArray(c[0]) && Array.isArray((c[0] as unknown[])[0])
      return isMulti
        ? (c as ([number, number] | [number, number, number])[][])
        : [c as ([number, number] | [number, number, number])[]]
    })
    return {
      bounds,
      coordinates,
      distanceKm:
        Math.round(preps.reduce((s, p) => s + p.distanceKm, 0) * 10) / 10,
      totalAscentM: Math.round(preps.reduce((s, p) => s + p.totalAscentM, 0)),
    }
  }, [entries])

  async function addFiles(files: FileList | File[]) {
    const next: GpxEntry[] = []
    const nextWpts: WaypointDraft[] = []
    for (const file of Array.from(files)) {
      if (!file.name.toLowerCase().endsWith(".gpx")) {
        toast.error(`${file.name}: GPX 파일만 올릴 수 있어요.`)
        continue
      }
      try {
        const gpxText = await file.text()
        const prepared = prepareTrailFromGpxText(gpxText)
        const id = crypto.randomUUID()
        next.push({ id, fileName: file.name, gpxText, prepared })
        extractWaypoints(gpxText).forEach((w, i) => {
          nextWpts.push({
            key: `${id}-${i}`,
            entryId: id,
            name: w.name || `웨이포인트 ${i + 1}`,
            lat: w.lat,
            lon: w.lon,
            ele: w.ele,
            // 출발·도착은 지도에 전용 마커가 있어 기본 미표시
            show: !w.isStartFinish,
          })
        })
      } catch {
        toast.error(`${file.name}: 트랙 정보를 읽지 못했어요.`)
      }
    }
    if (next.length === 0) return
    setEntries((prev) => [...prev, ...next])
    setWaypoints((prev) => [...prev, ...nextWpts])
    setName((prev) => {
      if (prev.trim()) return prev
      const first = next[0]
      return (
        first.prepared.nameFromGpx || displayNameFromFileName(first.fileName)
      )
    })
  }

  async function handleCreate() {
    if (!user || entries.length === 0 || creating) return
    const displayName = name.trim()
    if (!displayName) {
      toast.error("지도 이름을 입력해 주세요.")
      return
    }
    setCreating(true)
    try {
      const trail = await trailUploadOps.createTrailFromMultiGpxUpload({
        userId: user.id,
        entries,
        displayName,
      })
      const picked = importWaypoints
        ? waypoints.filter((w) => w.show && w.name.trim())
        : []
      if (picked.length > 0) {
        try {
          await checkpointRepo.createCheckpointsBulk({
            trailId: trail.id,
            userId: user.id,
            items: picked.map((w) => ({
              title: w.name.trim(),
              lat: w.lat,
              lng: w.lon,
            })),
          })
        } catch {
          // 지도는 이미 만들어짐 — 체크포인트는 편집 화면에서 다시 추가 가능
          toast.error("웨이포인트를 체크포인트로 옮기지 못했어요. 편집 화면에서 추가해 주세요.")
        }
      }
      toast.success(
        "코스지도를 만들었어요. 완료하기 전까지는 앱에 공개되지 않아요.",
      )
      router.replace(`/maps/${trail.id}/edit`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "지도 생성에 실패했어요.")
      setCreating(false)
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold">코스지도 만들기</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        GPX 파일을 올리면 경로·거리·누적 상승이 자동으로 계산돼요.
      </p>

      <div
        className={`mt-8 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
          dragOver ? "border-foreground/50 bg-muted/50" : "hover:bg-muted/30"
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          addFiles(e.dataTransfer.files)
        }}
      >
        <FileUp className="h-8 w-8 text-muted-foreground" />
        <div>
          <p className="font-medium">GPX 파일을 끌어다 놓거나 클릭해서 선택</p>
          <p className="mt-1 text-xs text-muted-foreground">
            여러 파일을 올리면 구간이 하나의 지도로 합쳐져요
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".gpx"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files)
            e.target.value = ""
          }}
        />
      </div>

      {entries.length > 0 && merged && (
        <div className="mt-6 space-y-6">
          <ul className="space-y-2">
            {entries.map((entry, i) => (
              <li
                key={`${entry.fileName}-${i}`}
                className="flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm"
              >
                <span className="truncate">{entry.fileName}</span>
                <span className="flex items-center gap-3 text-muted-foreground">
                  {entry.prepared.distanceKm}km
                  <button
                    type="button"
                    onClick={() => {
                      setEntries((prev) => prev.filter((_, j) => j !== i))
                      setWaypoints((prev) =>
                        prev.filter((w) => w.entryId !== entry.id),
                      )
                    }}
                    className="hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </span>
              </li>
            ))}
          </ul>

          <TrailMapPreview
            coordinates={merged.coordinates}
            bounds={merged.bounds}
            height={340}
          />

          <div className="flex items-center gap-5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Route className="h-4 w-4" /> {merged.distanceKm}km
            </span>
            <span className="flex items-center gap-1.5">
              <Mountain className="h-4 w-4" /> 누적 상승 {merged.totalAscentM}m
            </span>
          </div>

          {waypoints.length > 0 && (
            <div className="rounded-xl border">
              <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-semibold">
                    <Flag className="h-4 w-4" />
                    웨이포인트 {waypoints.length}개
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    체크한 지점을 체크포인트로 지도에 표시해요. 이름은 바로 고칠 수 있어요.
                  </p>
                </div>
                <label className="flex shrink-0 items-center gap-2 text-sm">
                  가져오기
                  <Switch
                    checked={importWaypoints}
                    onCheckedChange={setImportWaypoints}
                  />
                </label>
              </div>
              {importWaypoints && (
                <ul className="max-h-80 divide-y overflow-y-auto">
                  {waypoints.map((w) => (
                    <li key={w.key} className="flex items-center gap-3 px-4 py-2">
                      <Checkbox
                        checked={w.show}
                        onCheckedChange={(v) =>
                          setWaypoints((prev) =>
                            prev.map((x) =>
                              x.key === w.key ? { ...x, show: v === true } : x,
                            ),
                          )
                        }
                        aria-label="지도에 표시"
                      />
                      <Input
                        value={w.name}
                        onChange={(e) =>
                          setWaypoints((prev) =>
                            prev.map((x) =>
                              x.key === w.key ? { ...x, name: e.target.value } : x,
                            ),
                          )
                        }
                        className={
                          "h-8 flex-1 text-sm " + (w.show ? "" : "opacity-50")
                        }
                      />
                      <span className="w-14 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                        {w.ele != null ? `${w.ele}m` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="course-name">지도 이름</Label>
            <Input
              id="course-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 북한산 둘레길 1코스"
              className="h-11"
            />
          </div>

          <Button
            className="h-12 w-full bg-[#DC2F55] text-base text-white hover:bg-[#DC2F55]/90"
            onClick={handleCreate}
            disabled={creating || !name.trim()}
          >
            {creating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 만드는 중…
              </>
            ) : (
              "코스지도 만들기"
            )}
          </Button>
        </div>
      )}
    </main>
  )
}
