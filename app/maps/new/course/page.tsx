"use client"

import { useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { FileUp, Loader2, Mountain, Route, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import TrailMapPreview from "@/components/map/TrailMapPreview"
import { useCurrentUser } from "@/hooks/use-current-user"
import {
  displayNameFromFileName,
  prepareTrailFromGpxText,
  type PreparedTrailGeometry,
} from "@/lib/gpx-prep"
import { trailUploadOps } from "@/lib/repos/trailUpload"

type GpxEntry = {
  fileName: string
  gpxText: string
  prepared: PreparedTrailGeometry
}

export default function NewCoursePage() {
  const router = useRouter()
  const { user } = useCurrentUser()
  const [entries, setEntries] = useState<GpxEntry[]>([])
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
    for (const file of Array.from(files)) {
      if (!file.name.toLowerCase().endsWith(".gpx")) {
        toast.error(`${file.name} — GPX 파일만 올릴 수 있어요.`)
        continue
      }
      try {
        const gpxText = await file.text()
        const prepared = prepareTrailFromGpxText(gpxText)
        next.push({ fileName: file.name, gpxText, prepared })
      } catch {
        toast.error(`${file.name} — 트랙 정보를 읽지 못했어요.`)
      }
    }
    if (next.length === 0) return
    setEntries((prev) => [...prev, ...next])
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
      toast.success("코스지도를 만들었어요. 이제 체크포인트를 배치해 보세요.")
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
                    onClick={() =>
                      setEntries((prev) => prev.filter((_, j) => j !== i))
                    }
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
            className="h-12 w-full text-base"
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
