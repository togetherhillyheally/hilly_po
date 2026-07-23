/**
 * 체크포인트 사진 업로드 전처리 — canvas 리사이즈(JPEG) + exifr 로 GPS/촬영시각 추출
 */
import exifr from "exifr"

const MAX_LONG_EDGE = 1600
const JPEG_QUALITY = 0.85

export interface PhotoExif {
  lat: number | null
  lng: number | null
  takenAt: string | null // ISO
}

export async function extractPhotoExif(file: File): Promise<PhotoExif> {
  try {
    const data = await exifr.parse(file, {
      pick: ["latitude", "longitude", "DateTimeOriginal"],
    })
    const takenAtRaw = data?.DateTimeOriginal
    return {
      lat: typeof data?.latitude === "number" ? data.latitude : null,
      lng: typeof data?.longitude === "number" ? data.longitude : null,
      takenAt:
        takenAtRaw instanceof Date && !isNaN(takenAtRaw.getTime())
          ? takenAtRaw.toISOString()
          : null,
    }
  } catch {
    return { lat: null, lng: null, takenAt: null }
  }
}

/** 장변 1600px 로 다운스케일한 JPEG Blob 반환 (원본이 더 작으면 그대로 재인코딩) */
export async function resizeToJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  try {
    const longEdge = Math.max(bitmap.width, bitmap.height)
    const scale = longEdge > MAX_LONG_EDGE ? MAX_LONG_EDGE / longEdge : 1
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("이미지 처리에 실패했어요.")
    ctx.drawImage(bitmap, 0, 0, width, height)

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("이미지 변환에 실패했어요.")),
        "image/jpeg",
        JPEG_QUALITY,
      )
    })
  } finally {
    bitmap.close()
  }
}
