/**
 * 트래커 관제 이벤트 타입 (tracker_events / tracker_event_entries RPC 응답)
 */
import { parseBounds, parseCenter, parseCoordinates, toNumberOrNull } from "./trailTypes"
import type { Trail } from "./trailTypes"

export type TrackerEventType = "race" | "monitor"
export type TrackerEventStatus = "draft" | "live" | "finished" | "archived"

export interface TrackerEvent {
  id: string
  title: string
  event_type: TrackerEventType
  trail_id: string | null
  trail_name: string | null
  starts_at: string | null
  ends_at: string | null
  status: TrackerEventStatus
  public_token: string
  entry_count: number
  created_at: string
}

/** 참가자(엔트리) — 관리 화면용, 기기 정보 포함 */
export interface EventEntry {
  id: string
  device_id: string
  imei: string
  label: string | null
  device_status: string
  battery_mv: number | null
  last_seen_at: string | null
  display_name: string
  bib_no: string | null
  category: string | null
  user_id: string | null
  user_nickname: string | null
  created_at: string
}

/** 실시간 위치 한 줄 — 관전(공개) 응답. 관리자 응답은 기기 정보가 추가됨 */
export interface LiveEntry {
  entry_id: string
  display_name: string
  bib_no: string | null
  category: string | null
  /** 연결된 계정의 프로필 사진 (미연결 엔트리는 null) */
  avatar_url?: string | null
  lat: number | null
  lng: number | null
  recorded_at: string | null
  speed_kmh: number | null
  // ↓ admin_tracker_event_live_state 전용 (관전 응답에는 없음)
  device_id?: string
  fix?: string | null
  imei?: string
  battery_mv?: number | null
  device_last_seen_at?: string | null
  sos_at?: string | null
}

export interface TailPoint {
  entry_id: string
  lat: number
  lng: number
  recorded_at: string
}

export interface EventCourseCheckpoint {
  title: string
  lat: number
  lng: number
  sort_order: number
  marker_icon: string | null
  /** 포인트 상세(사진 조회 등)용 — 공개 지도 페이지에서 사용 */
  id?: string
  note?: string | null
}

export interface EventCourse {
  name: string
  distance_km: number | null
  bounds: Trail["bounds"]
  center: [number, number] | null
  coordinates: Trail["coordinates"]
  checkpoints: EventCourseCheckpoint[]
}

export interface PublicEventInfo {
  id: string
  title: string
  event_type: TrackerEventType
  status: TrackerEventStatus
  starts_at: string | null
  ends_at: string | null
  trail: EventCourse | null
}

/** 이벤트 확정 결과 한 줄 (tracker_event_results_list 응답) */
export interface EventResultRow {
  display_name: string
  bib_no: string | null
  category: string | null
  avatar_url: string | null
  rank: number | null
  category_rank: number | null
  status: "finished" | "dnf"
  finished_at: string | null
  elapsed_sec: number | null
  distance_km: number | null
  ascent_m: number | null
  user_id: string | null
}

/** 개인 업적 한 줄 (athlete_tracker_records 응답) */
export interface AthleteRecord {
  nickname: string | null
  avatar_url: string | null
  event_id: string
  event_title: string
  event_starts_at: string | null
  public_token: string
  rank: number | null
  category: string | null
  category_rank: number | null
  status: "finished" | "dnf"
  finished_at: string | null
  elapsed_sec: number | null
  distance_km: number | null
  ascent_m: number | null
}

/** 결과 확정 페이로드 (admin_finalize_tracker_event) */
export interface FinalizeResultInput {
  entry_id: string
  rank: number | null
  category_rank: number | null
  status: "finished" | "dnf"
  finished_at: string | null
  distance_km: number | null
  ascent_m: number | null
}

/** 관제용 기기 목록 (기존 admin_list_tracker_devices 응답) */
export interface TrackerDevice {
  id: string
  imei: string
  label: string | null
  status: string
  battery_mv: number | null
  last_seen_at: string | null
  created_at: string
  user_id: string | null
  user_nickname: string | null
}

export function parsePublicEventInfo(raw: unknown): PublicEventInfo {
  const o = (raw ?? {}) as Record<string, unknown>
  const trailRaw = o.trail as Record<string, unknown> | null | undefined
  let trail: EventCourse | null = null
  if (trailRaw && typeof trailRaw === "object") {
    const cps = Array.isArray(trailRaw.checkpoints) ? trailRaw.checkpoints : []
    trail = {
      name: String(trailRaw.name ?? ""),
      distance_km: toNumberOrNull(trailRaw.distance_km),
      bounds: parseBounds(trailRaw.bounds),
      center: parseCenter(trailRaw.center),
      coordinates: parseCoordinates(trailRaw.coordinates),
      checkpoints: cps
        .map((c) => {
          const cp = c as Record<string, unknown>
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
        .filter((c): c is EventCourseCheckpoint => c !== null),
    }
  }
  return {
    id: String(o.id ?? ""),
    title: String(o.title ?? ""),
    event_type: o.event_type === "monitor" ? "monitor" : "race",
    status: (["draft", "live", "finished", "archived"].includes(
      String(o.status),
    )
      ? String(o.status)
      : "draft") as TrackerEventStatus,
    starts_at: typeof o.starts_at === "string" ? o.starts_at : null,
    ends_at: typeof o.ends_at === "string" ? o.ends_at : null,
    trail,
  }
}
