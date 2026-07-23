/**
 * 트레일 경로 썸네일 — 생성은 Edge Function(generate-trail-thumbnail)이 service role 로 수행.
 * 저장 위치: trail-thumbnails/{trailId}.jpg, trails.thumbnail_path 갱신.
 */
import { getSupabase } from "@/lib/supabase/client"

const BUCKET = "trail-thumbnails"

export function trailThumbnailUrl(
  path: string | null | undefined,
): string | null {
  if (!path) return null
  return getSupabase().storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

/** 썸네일 생성 요청(비차단 호출 권장 — 실패해도 저장 자체는 성공 처리) */
export async function generateAndStoreTrailThumbnail(
  trailId: string,
): Promise<string | null> {
  const { data, error } = await getSupabase().functions.invoke(
    "generate-trail-thumbnail",
    {
      body: {
        trailId,
        mapboxToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
      },
    },
  )
  if (error) throw error
  if (data?.error) throw new Error(String(data.error))
  return (data?.path as string) ?? null
}
