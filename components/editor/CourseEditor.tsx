"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import {
  Eye,
  ImagePlus,
  Loader2,
  MapPin,
  MousePointerClick,
  Trash2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import CheckpointMap, { type LatLng } from "@/components/map/CheckpointMap"
import CourseGuideView from "./CourseGuideView"
import { PhotoUploader } from "./PhotoUploader"
import { PublishBar } from "./PublishBar"
import { sortCheckpointsAlongPath } from "@/lib/checkpoint-order"
import { extractPhotoExif, resizeToJpeg } from "@/lib/image"
import { checkpointRepo } from "@/lib/repos/checkpointRepo"
import { generateAndStoreTrailThumbnail } from "@/lib/repos/trailThumbnail"
import type { Trail, TrailCheckpoint } from "@/lib/repos/trailTypes"
import {
  CHECKPOINT_MARKERS,
  CHECKPOINT_MARKER_BG,
  getMarkerEntry,
} from "@/lib/checkpoint-markers"

export default function CourseEditor({
  trail,
  userId,
}: {
  trail: Trail
  userId: string
}) {
  const [mode, setMode] = useState<"view" | "edit">("view")
  const [checkpoints, setCheckpoints] = useState<TrailCheckpoint[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [addMode, setAddMode] = useState(false)
  const [creating, setCreating] = useState(false)
  const exifInputRef = useRef<HTMLInputElement | null>(null)

  // GPS 없는 사진 — 지도 클릭으로 위치 지정 대기 중
  const [pendingPhoto, setPendingPhoto] = useState<{
    file: File
    takenAt: string | null
  } | null>(null)
  const [pendingPhotoUrl, setPendingPhotoUrl] = useState<string | null>(null)

  // 선택 체크포인트 편집 드래프트
  const [draftTitle, setDraftTitle] = useState("")
  const [draftNote, setDraftNote] = useState("")
  const [draftIcon, setDraftIcon] = useState("flag-outline")
  const [saving, setSaving] = useState(false)

  const selected = useMemo(
    () => checkpoints.find((c) => c.id === selectedId) ?? null,
    [checkpoints, selectedId],
  )

  const orderedCheckpoints = useMemo(
    () => sortCheckpointsAlongPath(checkpoints, trail.coordinates),
    [checkpoints, trail.coordinates],
  )

  const reload = useCallback(async () => {
    try {
      setCheckpoints(await checkpointRepo.listCheckpoints(trail.id))
    } catch {
      toast.error("체크포인트를 불러오지 못했어요.")
    } finally {
      setLoading(false)
    }
  }, [trail.id])

  useEffect(() => {
    reload()
  }, [reload])

  // 대기중인 사진의 미리보기 URL 관리
  useEffect(() => {
    if (!pendingPhoto) {
      setPendingPhotoUrl(null)
      return
    }
    const url = URL.createObjectURL(pendingPhoto.file)
    setPendingPhotoUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [pendingPhoto])

  function cancelPendingPhoto() {
    setPendingPhoto(null)
    setAddMode(false)
  }

  // 선택 변경 시 드래프트 동기화
  useEffect(() => {
    if (!selected) return
    setDraftTitle(selected.title)
    setDraftNote(selected.note ?? "")
    setDraftIcon(selected.marker_icon ?? "flag-outline")
  }, [selected])

  /** 지도 클릭 즉시 체크포인트 생성 — 대기중인 사진이 있으면 그 자리에서 바로 첨부 */
  async function createAt(point: LatLng) {
    if (creating) return
    setCreating(true)
    try {
      const cp = await checkpointRepo.createCheckpoint({
        trailId: trail.id,
        userId,
        title: `체크포인트 ${checkpoints.length + 1}`,
        lng: point.lng,
        lat: point.lat,
      })
      setCheckpoints((prev) => [...prev, cp])
      setAddMode(false)

      if (pendingPhoto) {
        const photo = pendingPhoto
        setPendingPhoto(null)
        try {
          const blob = await resizeToJpeg(photo.file)
          await checkpointRepo.uploadCheckpointPhoto({
            userId,
            checkpointId: cp.id,
            blob,
            fileSize: photo.file.size,
            takenAt: photo.takenAt,
          })
          toast.success("체크포인트를 만들고 사진을 추가했어요.")
        } catch {
          toast.error("체크포인트는 만들었지만 사진 업로드에 실패했어요.")
        }
      }

      // 사진 업로드가 끝난 뒤에 선택해야 PhotoUploader 최초 조회에 방금 올린 사진이 잡힘
      setSelectedId(cp.id)
      generateAndStoreTrailThumbnail(trail.id).catch(() => {})
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "체크포인트 생성에 실패했어요.")
    } finally {
      setCreating(false)
    }
  }

  /**
   * 사진 EXIF GPS 로 체크포인트 생성 + 사진 자동 첨부.
   * GPS 정보가 없으면(카카오톡 등으로 전송돼 EXIF 가 제거된 사진 등) 에러로 끝내지 않고
   * 사진을 대기시킨 뒤 지도 클릭 모드로 자동 전환해, 클릭 한 번으로 위치를 지정하게 한다.
   */
  async function createFromPhoto(file: File) {
    if (creating) return
    setCreating(true)
    try {
      const exif = await extractPhotoExif(file)
      if (exif.lat == null || exif.lng == null) {
        setPendingPhoto({ file, takenAt: exif.takenAt })
        setSelectedId(null)
        setAddMode(true)
        toast("사진에 위치 정보가 없어요. 지도를 클릭해 이 사진의 위치를 지정해 주세요.")
        return
      }
      const cp = await checkpointRepo.createCheckpoint({
        trailId: trail.id,
        userId,
        title: `체크포인트 ${checkpoints.length + 1}`,
        lng: exif.lng,
        lat: exif.lat,
      })
      setCheckpoints((prev) => [...prev, cp])
      const blob = await resizeToJpeg(file)
      await checkpointRepo.uploadCheckpointPhoto({
        userId,
        checkpointId: cp.id,
        blob,
        fileSize: file.size,
        takenAt: exif.takenAt,
      })
      // 사진 업로드가 끝난 뒤에 선택해야 PhotoUploader 최초 조회에 방금 올린 사진이 잡힘
      setSelectedId(cp.id)
      toast.success("사진 위치에 체크포인트를 만들었어요.")
      generateAndStoreTrailThumbnail(trail.id).catch(() => {})
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "체크포인트 생성에 실패했어요.")
    } finally {
      setCreating(false)
    }
  }

  async function saveSelected() {
    if (!selected || saving) return
    setSaving(true)
    try {
      const update = {
        title: draftTitle.trim() || selected.title,
        note: draftNote.trim() || null,
        marker_icon: draftIcon,
      }
      await checkpointRepo.updateCheckpoint(selected.id, update)
      setCheckpoints((prev) =>
        prev.map((c) => (c.id === selected.id ? { ...c, ...update } : c)),
      )
      toast.success("저장했어요.")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장에 실패했어요.")
    } finally {
      setSaving(false)
    }
  }

  async function deleteSelected() {
    if (!selected) return
    try {
      await checkpointRepo.deleteCheckpointById(selected.id)
      setCheckpoints((prev) => prev.filter((c) => c.id !== selected.id))
      setSelectedId(null)
      toast.success("체크포인트를 삭제했어요.")
    } catch {
      toast.error("삭제에 실패했어요.")
    }
  }

  if (mode === "view") {
    return (
      <CourseGuideView
        trail={trail}
        checkpoints={checkpoints}
        loading={loading}
        onEdit={() => setMode("edit")}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100vh-3.5rem)] lg:flex-row lg:gap-0">
      {/* 지도 */}
      <div className="relative flex-1 p-4 lg:pr-2">
        <CheckpointMap
          coordinates={
            (trail.coordinates ?? []) as
              | [number, number][]
              | [number, number][][]
          }
          bounds={trail.bounds ?? undefined}
          start={
            trail.start_lat != null && trail.start_lng != null
              ? { lat: trail.start_lat, lng: trail.start_lng }
              : null
          }
          end={
            trail.end_lat != null && trail.end_lng != null
              ? { lat: trail.end_lat, lng: trail.end_lng }
              : null
          }
          checkpoints={orderedCheckpoints.map((c, i) => ({
            id: c.id,
            lng: c.lng,
            lat: c.lat,
            title: c.title,
            sort_order: i + 1,
            marker_icon:
              c.id === selectedId ? draftIcon : c.marker_icon,
          }))}
          selectedId={selectedId}
          addMode={addMode}
          onMapClick={createAt}
          onMarkerClick={(id) => {
            setSelectedId(id)
            setAddMode(false)
            setPendingPhoto(null)
          }}
          height="100%"
          className="min-h-[420px] lg:h-full"
        />
        {addMode && pendingPhoto && pendingPhotoUrl && (
          <div className="absolute left-1/2 top-8 flex -translate-x-1/2 items-center gap-2 rounded-full bg-foreground py-1.5 pl-1.5 pr-2 text-sm font-medium text-background shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pendingPhotoUrl}
              alt=""
              className="h-7 w-7 rounded-full object-cover"
            />
            <span className="pointer-events-none">
              지도를 클릭해 이 사진의 위치를 지정하세요
            </span>
            <button
              type="button"
              onClick={cancelPendingPhoto}
              className="rounded-full p-0.5 hover:bg-background/20"
              aria-label="취소"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {addMode && !pendingPhoto && (
          <div className="pointer-events-none absolute left-1/2 top-8 -translate-x-1/2 rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background shadow-lg">
            지도를 클릭하면 체크포인트가 바로 추가돼요
          </div>
        )}
      </div>

      {/* 우측 패널 */}
      <aside className="w-full shrink-0 space-y-4 overflow-y-auto p-4 lg:w-96 lg:pl-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold">{trail.name}</h1>
            <p className="text-xs text-muted-foreground">
              코스지도 · 체크포인트 {checkpoints.length}개 · 변경사항 자동 저장
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setMode("view")}>
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            보기
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            variant={addMode ? "default" : "outline"}
            size="sm"
            className="flex-1"
            onClick={() => {
              setAddMode((v) => !v)
              setSelectedId(null)
              setPendingPhoto(null)
            }}
          >
            <MousePointerClick className="mr-1.5 h-4 w-4" />
            {addMode ? "추가 모드 끄기" : "지도 클릭으로 추가"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            disabled={creating}
            onClick={() => exifInputRef.current?.click()}
          >
            <ImagePlus className="mr-1.5 h-4 w-4" />
            사진 위치로 추가
          </Button>
          <input
            ref={exifInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) createFromPhoto(f)
              e.target.value = ""
            }}
          />
        </div>

        {/* 목록 */}
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : checkpoints.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            <MapPin className="mx-auto mb-2 h-6 w-6" />
            아직 체크포인트가 없어요.
            <br />
            지도를 클릭해 첫 체크포인트를 놓아 보세요.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {orderedCheckpoints.map((cp, i) => (
              <li key={cp.id}>
                <div
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    selectedId === cp.id
                      ? "border-foreground/40 bg-muted/50"
                      : "hover:bg-muted/30"
                  }`}
                  onClick={() =>
                    setSelectedId(selectedId === cp.id ? null : cp.id)
                  }
                >
                  {(() => {
                    const entry = getMarkerEntry(
                      cp.id === selectedId ? draftIcon : cp.marker_icon,
                    )
                    return (
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2"
                        style={{
                          background: CHECKPOINT_MARKER_BG,
                          borderColor: entry.accent,
                        }}
                      >
                        <entry.Icon
                          className="h-3.5 w-3.5"
                          style={{ color: entry.accent }}
                          strokeWidth={2.2}
                        />
                      </span>
                    )
                  })()}
                  <span className="w-4 shrink-0 text-xs tabular-nums text-muted-foreground">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{cp.title}</span>
                </div>

                {/* 선택된 체크포인트 상세 편집 */}
                {selectedId === cp.id && selected && (
                  <div className="mt-1.5 space-y-4 rounded-xl border p-3.5">
                    <div className="space-y-2">
                      <Label className="text-sm">이름</Label>
                      <Input
                        value={draftTitle}
                        onChange={(e) => setDraftTitle(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">아이콘</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {CHECKPOINT_MARKERS.map((m) => {
                          const active = draftIcon === m.icon
                          return (
                            <button
                              key={m.icon}
                              type="button"
                              title={m.name}
                              onClick={() => setDraftIcon(m.icon)}
                              className="flex h-8 w-8 items-center justify-center rounded-full border-2 transition-transform hover:scale-105"
                              style={{
                                background: active
                                  ? m.accent
                                  : CHECKPOINT_MARKER_BG,
                                borderColor: active ? "#fff" : m.accent,
                              }}
                            >
                              <m.Icon
                                className="h-4 w-4"
                                style={{
                                  color: active ? "#fff" : m.accent,
                                }}
                                strokeWidth={2.2}
                              />
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <Separator />
                    <PhotoUploader userId={userId} checkpointId={cp.id} />
                    <div className="space-y-2">
                      <Label className="text-sm">설명</Label>
                      <Textarea
                        value={draftNote}
                        onChange={(e) => setDraftNote(e.target.value)}
                        placeholder="이 지점에 대한 설명이나 미션 안내를 적어 주세요"
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={saveSelected}
                        disabled={saving}
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "저장"
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={deleteSelected}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="sticky bottom-0 -mx-4 border-t bg-background/95 p-4 backdrop-blur lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0">
          <PublishBar
            trail={trail}
            pointCount={checkpoints.length}
            pointNoun="체크포인트"
          />
        </div>
      </aside>
    </div>
  )
}
