/**
 * 트래커 관제 이벤트 RPC 래퍼 — 모든 접근은 SECURITY DEFINER RPC 경유
 * (테이블 RLS 는 전부 차단이라 .from() 직접 조회는 불가)
 */
import { getSupabase } from "@/lib/supabase/client"
import {
  type AthleteRecord,
  type EventEntry,
  type EventResultRow,
  type FinalizeResultInput,
  type LiveEntry,
  type PublicEventInfo,
  type TailPoint,
  type TrackerDevice,
  type TrackerEvent,
  parsePublicEventInfo,
} from "./trackerControlTypes"

export interface UpsertEventInput {
  id?: string | null
  title: string
  event_type: "race" | "monitor"
  trail_id: string | null
  starts_at: string | null // ISO
  ends_at: string | null
  status?: string | null // null = 유지 (생성 시 draft)
}

export interface UpsertEntryInput {
  id?: string | null
  event_id: string
  device_id: string
  display_name: string
  bib_no?: string | null
  category?: string | null
  user_id?: string | null
}

export const trackerControlRepo = {
  async isSuperAdminSelf(): Promise<boolean> {
    const { data, error } = await getSupabase().rpc("is_super_admin_self")
    if (error) throw error
    return Boolean(data)
  },

  // ── 이벤트 ──
  async listEvents(): Promise<TrackerEvent[]> {
    const { data, error } = await getSupabase().rpc("admin_list_tracker_events")
    if (error) throw error
    return (data ?? []) as TrackerEvent[]
  },

  async upsertEvent(input: UpsertEventInput): Promise<TrackerEvent> {
    const { data, error } = await getSupabase().rpc(
      "admin_upsert_tracker_event",
      {
        p_id: input.id ?? null,
        p_title: input.title,
        p_event_type: input.event_type,
        p_trail_id: input.trail_id,
        p_starts_at: input.starts_at,
        p_ends_at: input.ends_at,
        p_status: input.status ?? null,
      },
    )
    if (error) throw error
    return data as TrackerEvent
  },

  async deleteEvent(id: string): Promise<void> {
    const { error } = await getSupabase().rpc("admin_delete_tracker_event", {
      p_id: id,
    })
    if (error) throw error
  },

  // ── 참가자(엔트리) ──
  async listEntries(eventId: string): Promise<EventEntry[]> {
    const { data, error } = await getSupabase().rpc(
      "admin_list_event_entries",
      { p_event_id: eventId },
    )
    if (error) throw error
    return (data ?? []) as EventEntry[]
  },

  async upsertEntry(input: UpsertEntryInput): Promise<void> {
    const { error } = await getSupabase().rpc("admin_upsert_event_entry", {
      p_id: input.id ?? null,
      p_event_id: input.event_id,
      p_device_id: input.device_id,
      p_display_name: input.display_name,
      p_bib_no: input.bib_no ?? null,
      p_category: input.category ?? null,
      p_user_id: input.user_id ?? null,
    })
    if (error) throw error
  },

  async deleteEntry(id: string): Promise<void> {
    const { error } = await getSupabase().rpc("admin_delete_event_entry", {
      p_id: id,
    })
    if (error) throw error
  },

  /** 전체 기기 목록 (기존 admin RPC 재사용) */
  async listAllDevices(): Promise<TrackerDevice[]> {
    const { data, error } = await getSupabase().rpc(
      "admin_list_tracker_devices",
    )
    if (error) throw error
    return (data ?? []) as TrackerDevice[]
  },

  /** 회원 닉네임 검색 (선택적 계정 연결용, 기존 admin RPC 재사용) */
  async searchMembers(
    query: string,
  ): Promise<{ id: string; nickname: string }[]> {
    const { data, error } = await getSupabase().rpc("admin_search_members", {
      p_query: query,
    })
    if (error) throw error
    return (data ?? []) as { id: string; nickname: string }[]
  },

  /** 카드 썸네일용 — trail id 목록의 썸네일/거리 조회 (읽기 불가한 지도는 빠짐) */
  async fetchTrailCards(
    trailIds: string[],
  ): Promise<Map<string, { thumbnail_path: string | null; distance_km: number | null }>> {
    const ids = Array.from(new Set(trailIds.filter(Boolean)))
    if (ids.length === 0) return new Map()
    const { data, error } = await getSupabase()
      .from("trails")
      .select("id, thumbnail_path, distance_km")
      .in("id", ids)
    if (error) throw error
    const map = new Map<
      string,
      { thumbnail_path: string | null; distance_km: number | null }
    >()
    for (const row of (data ?? []) as {
      id: string
      thumbnail_path: string | null
      distance_km: number | null
    }[]) {
      map.set(row.id, {
        thumbnail_path: row.thumbnail_path,
        distance_km: row.distance_km == null ? null : Number(row.distance_km),
      })
    }
    return map
  },

  /** 이벤트에 연결할 코스 후보 — 완료(published)된 지도 */
  async listSelectableTrails(): Promise<
    { id: string; name: string; distance_km: number | null }[]
  > {
    const { data, error } = await getSupabase()
      .from("trails")
      .select("id, name, distance_km")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(200)
    if (error) throw error
    return (data ?? []) as { id: string; name: string; distance_km: number | null }[]
  },

  // ── 실시간 상태 ──
  async adminLiveState(eventId: string): Promise<LiveEntry[]> {
    const { data, error } = await getSupabase().rpc(
      "admin_tracker_event_live_state",
      { p_event_id: eventId },
    )
    if (error) throw error
    return (data ?? []) as LiveEntry[]
  },

  async publicLiveState(token: string): Promise<LiveEntry[]> {
    const { data, error } = await getSupabase().rpc(
      "tracker_event_public_state",
      { p_token: token },
    )
    if (error) throw error
    return (data ?? []) as LiveEntry[]
  },

  async publicEventInfo(token: string): Promise<PublicEventInfo> {
    const { data, error } = await getSupabase().rpc(
      "tracker_event_public_info",
      { p_token: token },
    )
    if (error) throw error
    return parsePublicEventInfo(data)
  },

  // ── 결과 확정 / 기록 ──
  /** 이벤트 종료 시 최종 순위·기록 스냅샷 저장 (기존 결과 덮어씀) */
  async finalizeEvent(
    eventId: string,
    results: FinalizeResultInput[],
  ): Promise<number> {
    const { data, error } = await getSupabase().rpc(
      "admin_finalize_tracker_event",
      { p_event_id: eventId, p_results: results },
    )
    if (error) throw error
    return Number(data ?? 0)
  },

  /** 종료된 이벤트의 확정 결과 (공개) */
  async eventResults(token: string): Promise<EventResultRow[]> {
    const { data, error } = await getSupabase().rpc(
      "tracker_event_results_list",
      { p_token: token },
    )
    if (error) throw error
    return (data ?? []) as EventResultRow[]
  },

  /** 개인 업적 — 계정 연결된 결과만 (공개) */
  async athleteRecords(userId: string): Promise<AthleteRecord[]> {
    const { data, error } = await getSupabase().rpc("athlete_tracker_records", {
      p_user_id: userId,
    })
    if (error) throw error
    return (data ?? []) as AthleteRecord[]
  },

  async eventTails(token: string, minutes = 30): Promise<TailPoint[]> {
    const { data, error } = await getSupabase().rpc("tracker_event_tails", {
      p_token: token,
      p_minutes: minutes,
    })
    if (error) throw error
    return (data ?? []) as TailPoint[]
  },
}
