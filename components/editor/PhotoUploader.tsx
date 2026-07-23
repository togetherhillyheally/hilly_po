"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { ImagePlus, Loader2, X } from "lucide-react"
import { Label } from "@/components/ui/label"
import { MAX_PHOTOS_PER_CHECKPOINT } from "@/lib/checkpoint-constants"
import { extractPhotoExif, resizeToJpeg } from "@/lib/image"
import { checkpointRepo } from "@/lib/repos/checkpointRepo"
import {
  checkpointPhotoThumbUrl,
  type TrailCheckpointPhoto,
} from "@/lib/repos/trailTypes"

/** 체크포인트 사진 관리 — 업로드(리사이즈+EXIF 촬영시각)/삭제 */
export function PhotoUploader({
  userId,
  checkpointId,
}: {
  userId: string
  checkpointId: string
}) {
  const [photos, setPhotos] = useState<TrailCheckpointPhoto[] | null>(null)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    let cancelled = false
    setPhotos(null)
    checkpointRepo
      .listCheckpointPhotos(checkpointId)
      .then((rows) => {
        if (!cancelled) setPhotos(rows)
      })
      .catch(() => {
        if (!cancelled) setPhotos([])
      })
    return () => {
      cancelled = true
    }
  }, [checkpointId])

  async function handleFiles(files: FileList) {
    if (uploading) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const [blob, exif] = await Promise.all([
          resizeToJpeg(file),
          extractPhotoExif(file),
        ])
        const row = await checkpointRepo.uploadCheckpointPhoto({
          userId,
          checkpointId,
          blob,
          fileSize: file.size,
          takenAt: exif.takenAt,
        })
        setPhotos((prev) => [...(prev ?? []), row])
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "사진 업로드에 실패했어요.")
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(photo: TrailCheckpointPhoto) {
    try {
      await checkpointRepo.deleteCheckpointPhoto(photo.id, userId)
      setPhotos((prev) => (prev ?? []).filter((p) => p.id !== photo.id))
    } catch {
      toast.error("사진 삭제에 실패했어요.")
    }
  }

  const count = photos?.length ?? 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm">사진</Label>
        <span className="text-xs text-muted-foreground">
          {count}/{MAX_PHOTOS_PER_CHECKPOINT}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(photos ?? []).map((photo) => (
          <div
            key={photo.id}
            className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={checkpointPhotoThumbUrl(photo, 300)}
              alt=""
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => handleDelete(photo)}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {count < MAX_PHOTOS_PER_CHECKPOINT && (
          <button
            type="button"
            disabled={uploading || photos === null}
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square items-center justify-center rounded-lg border border-dashed text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground disabled:opacity-50"
          >
            {uploading || photos === null ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ImagePlus className="h-5 w-5" />
            )}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) handleFiles(e.target.files)
          e.target.value = ""
        }}
      />
    </div>
  )
}
