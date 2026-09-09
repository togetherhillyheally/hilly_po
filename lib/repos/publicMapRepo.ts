/**
 * 공개 지도 페이지(/m/[id]) 데이터 — public_map_by_id RPC.
 * 정책: 완료(published) 지도는 링크로 누구나 조회 가능(앱 공개/비공개와 무관),
 * 작성중(draft)은 본인 외 조회 불가.
 */
import { getSupabase } from "@/lib/supabase/client"
import {
  parseBounds,
  parseCenter,
  parseCoordinates,
  toNumberOrNull,
} from "./trailTypes"
import type { Trail } from "./trailTypes"
import type { EventCourseCheckpoint } from "./trackerControlTypes"

export interface PublicMapData {
  name: string
  map_type: "adventure" | "stamp"
  visibility: "public" | "private"
  distance_km: number | null
  total_ascent_m: number | null
  bounds: Trail["bounds"]
  center: [number, number] | null
  coordinates: Trail["coordinates"]
  thumbnail_path: string | null
  points: EventCourseCheckpoint[]
}

export async function loadPublicMap(id: string): Promise<PublicMapData | null> {
  const { data, error } = await getSupabase().rpc("public_map_by_id", {
    p_id: id,
  })
  if (error) return null
  const o = (data ?? {}) as Record<string, unknown>
  const rawPoints = Array.isArray(o.points) ? o.points : []
  return {
    name: String(o.name ?? ""),
    map_type: o.map_type === "stamp" ? "stamp" : "adventure",
    visibility: o.visibility === "private" ? "private" : "public",
    distance_km: toNumberOrNull(o.distance_km),
    total_ascent_m: toNumberOrNull(o.total_ascent_m),
    bounds: parseBounds(o.bounds),
    center: parseCenter(o.center),
    coordinates: parseCoordinates(o.coordinates),
    thumbnail_path:
      typeof o.thumbnail_path === "string" ? o.thumbnail_path : null,
    points: rawPoints
      .map((p) => {
        const cp = p as Record<string, unknown>
        const lat = toNumberOrNull(cp.lat)
        const lng = toNumberOrNull(cp.lng)
        if (lat == null || lng == null) return null
        return {
          title: String(cp.title ?? ""),
          lat,
          lng,
          sort_order: toNumberOrNull(cp.sort_order) ?? 0,
          marker_icon:
            typeof cp.marker_icon === "string" ? cp.marker_icon : null,
        }
      })
      .filter((p): p is EventCourseCheckpoint => p !== null),
  }
}
