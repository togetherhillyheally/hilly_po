/**
 * 트레일 관련 타입 정의 및 파싱 유틸리티 (hilly_rn trailTypes.ts 웹 포트)
 */
import { getSupabase } from "@/lib/supabase/client"

export type ActivityType = "walking" | "running" | "cycling"

const ACTIVITY_TYPE_SET = new Set<ActivityType>([
  "walking",
  "running",
  "cycling",
])

function parseActivityTypes(value: unknown): ActivityType[] {
  if (!Array.isArray(value)) return ["walking", "running"]
  const filtered = value.filter(
    (v): v is ActivityType =>
      typeof v === "string" && ACTIVITY_TYPE_SET.has(v as ActivityType),
  )
  return filtered.length > 0 ? filtered : ["walking", "running"]
}

export interface Trail {
  id: string
  name: string
  day: number | null
  gpx_storage_bucket: string
  gpx_storage_path: string
  distance_km: number | null
  total_ascent_m: number | null
  bounds: {
    minLat: number
    maxLat: number
    minLon: number
    maxLon: number
  } | null
  center: [number, number] | null
  coordinates:
    | [number, number, number?][]
    | [number, number, number?][][]
    | null
  sort_order: number
  created_by: string | null
  source: string | null
  map_type: "adventure" | "stamp"
  /** 작성중(draft) 지도는 앱에서 본인에게만 보임. 완료 시 published. */
  status: "draft" | "published"
  /** 완료한 지도도 비공개(private)로 숨길 수 있음 — 본인에게만 보임 */
  visibility: "public" | "private"
  stamp_order_mode?: "ordered" | "free" | "random"
  is_multi_route?: boolean
  activity_types: ActivityType[]
  series_name?: string | null
  course_summary?: string | null
  thumbnail_path?: string | null
  start_lat?: number | null
  start_lng?: number | null
  end_lat?: number | null
  end_lng?: number | null
}

/** 객관식 퀴즈 — 포인트당 최대 1개 (question/choices/answer_index 는 all-or-none) */
export interface PointQuiz {
  quiz_question: string | null
  quiz_choices: string[] | null
  quiz_answer_index: number | null
}

export interface TrailCheckpoint extends PointQuiz {
  id: string
  trail_id: string
  sort_order: number
  title: string
  lng: number
  lat: number
  note: string | null
  marker_icon?: string | null
  created_by?: string | null
  /** GPS 도착 반경(m). NULL = 앱 기본 10m */
  radius_m: number | null
}

export interface TrailCheckpointPhoto {
  id: string
  checkpoint_id: string
  author_id: string
  storage_bucket: string
  storage_path: string
  created_at: string
}

// ── 테이블 상수 ──
export const TRAILS_TABLE = "trails"
export const CHECKPOINTS_TABLE = "trail_checkpoints"
export const CHECKPOINT_PHOTOS_TABLE = "trail_checkpoint_photos"
export const TRAIL_GPX_STORAGE_BUCKET = "trail-gpx"

// ── 파싱 유틸리티 ──

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuidString(s: string): boolean {
  return UUID_RE.test(s)
}

export function checkpointPhotoPublicUrl(row: {
  storage_bucket: string
  storage_path: string
}): string {
  return getSupabase()
    .storage.from(row.storage_bucket)
    .getPublicUrl(row.storage_path).data.publicUrl
}

export function checkpointPhotoThumbUrl(
  row: { storage_bucket: string; storage_path: string },
  width = 900,
): string {
  return getSupabase()
    .storage.from(row.storage_bucket)
    .getPublicUrl(row.storage_path, {
      transform: { width, resize: "contain", quality: 65 },
    }).data.publicUrl
}

export function toNumberOrNull(v: unknown): number | null {
  if (v == null) return null
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

export function parseQuizChoices(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null
  const out = v.filter((c): c is string => typeof c === "string")
  return out.length > 0 ? out : null
}

export function parseCenter(v: unknown): [number, number] | null {
  if (!Array.isArray(v) || v.length !== 2) return null
  const lon = toNumberOrNull(v[0])
  const lat = toNumberOrNull(v[1])
  if (lon == null || lat == null) return null
  return [lon, lat]
}

function parseSingleLine(v: unknown[]): [number, number, number?][] {
  const out: [number, number, number?][] = []
  for (const row of v) {
    if (!Array.isArray(row) || row.length < 2) continue
    const lon = toNumberOrNull(row[0])
    const lat = toNumberOrNull(row[1])
    if (lon == null || lat == null) continue
    const ele = row.length >= 3 ? toNumberOrNull(row[2]) : null
    out.push(ele != null ? [lon, lat, ele] : [lon, lat])
  }
  return out
}

export function parseCoordinates(
  v: unknown,
): [number, number, number?][] | [number, number, number?][][] | null {
  if (!Array.isArray(v) || v.length === 0) return null
  if (Array.isArray(v[0]) && v[0].length > 0 && Array.isArray(v[0][0])) {
    const out: [number, number, number?][][] = []
    for (const line of v) {
      if (!Array.isArray(line)) continue
      const parsed = parseSingleLine(line)
      if (parsed.length) out.push(parsed)
    }
    return out.length ? out : null
  }
  const out = parseSingleLine(v)
  return out.length ? out : null
}

export function parseBounds(v: unknown): Trail["bounds"] {
  if (!v || typeof v !== "object") return null
  const o = v as Record<string, unknown>
  const minLat = toNumberOrNull(o.minLat)
  const maxLat = toNumberOrNull(o.maxLat)
  const minLon = toNumberOrNull(o.minLon)
  const maxLon = toNumberOrNull(o.maxLon)
  if (minLat == null || maxLat == null || minLon == null || maxLon == null)
    return null
  return { minLat, maxLat, minLon, maxLon }
}

export function parseTrailRow(row: Record<string, unknown>): Trail {
  const createdRaw = row.created_by
  const created_by =
    typeof createdRaw === "string"
      ? createdRaw
      : createdRaw == null
        ? null
        : String(createdRaw)
  const sourceRaw = row.source
  const source =
    typeof sourceRaw === "string"
      ? sourceRaw
      : sourceRaw == null
        ? null
        : String(sourceRaw)
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    day: row.day == null ? null : Number(row.day),
    gpx_storage_bucket: String(row.gpx_storage_bucket ?? ""),
    gpx_storage_path: String(row.gpx_storage_path ?? ""),
    distance_km: toNumberOrNull(row.distance_km),
    total_ascent_m: toNumberOrNull(row.total_ascent_m),
    bounds: parseBounds(row.bounds),
    center: parseCenter(row.center),
    coordinates: parseCoordinates(row.coordinates),
    sort_order: toNumberOrNull(row.sort_order) ?? 0,
    created_by,
    source,
    is_multi_route: Boolean(
      row.is_multi_route ??
        (Array.isArray(row.coordinates) &&
          (row.coordinates as unknown[]).length > 0 &&
          Array.isArray((row.coordinates as unknown[][])[0]?.[0])),
    ),
    map_type: (row.map_type === "stamp" ? "stamp" : "adventure") as
      | "adventure"
      | "stamp",
    status: row.status === "draft" ? "draft" : "published",
    visibility: row.visibility === "private" ? "private" : "public",
    stamp_order_mode:
      row.stamp_order_mode === "ordered"
        ? "ordered"
        : row.stamp_order_mode === "free"
          ? "free"
          : row.stamp_order_mode === "random"
            ? "random"
            : undefined,
    activity_types: parseActivityTypes(row.activity_types),
    series_name: typeof row.series_name === "string" ? row.series_name : null,
    course_summary:
      typeof row.course_summary === "string" ? row.course_summary : null,
    thumbnail_path:
      typeof row.thumbnail_path === "string" ? row.thumbnail_path : null,
    start_lat: toNumberOrNull(row.start_lat),
    start_lng: toNumberOrNull(row.start_lng),
    end_lat: toNumberOrNull(row.end_lat),
    end_lng: toNumberOrNull(row.end_lng),
  }
}
