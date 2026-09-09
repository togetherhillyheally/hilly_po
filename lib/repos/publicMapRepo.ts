/**
 * 공개 지도 페이지(/m/[id]) 데이터 — RLS 가 공개(published+public)·본인 지도만 통과시킴.
 * 코스지도는 trail_checkpoints, 스탬프지도는 stamp_points 를 포인트로 사용.
 */
import { getSupabase } from "@/lib/supabase/client"
import { trailRepo } from "./trailRepo"
import type { Trail } from "./trailTypes"
import type { EventCourseCheckpoint } from "./trackerControlTypes"

export interface PublicMap {
  trail: Trail
  points: EventCourseCheckpoint[]
}

export async function loadPublicMap(id: string): Promise<PublicMap | null> {
  const trail = await trailRepo.getTrailById(id)
  if (!trail) return null

  let points: EventCourseCheckpoint[] = []
  try {
    if (trail.map_type === "stamp") {
      const { data, error } = await getSupabase()
        .from("stamp_points")
        .select("title, lat, lng, sort_order")
        .eq("trail_id", id)
        .order("sort_order")
      if (error) throw error
      points = ((data ?? []) as {
        title: string
        lat: number
        lng: number
        sort_order: number
      }[]).map((p) => ({ ...p, marker_icon: null }))
    } else {
      const { data, error } = await getSupabase()
        .from("trail_checkpoints")
        .select("title, lat, lng, sort_order, marker_icon")
        .eq("trail_id", id)
        .order("sort_order")
      if (error) throw error
      points = (data ?? []) as EventCourseCheckpoint[]
    }
  } catch {
    // 포인트 로드 실패 — 지도(경로)만 표시
  }
  return { trail, points }
}
