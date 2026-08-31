/**
 * 앱 "모험중" 라이브 관제 — hiking_sessions + hiking_session_live_participants 조회.
 * 두 테이블 모두 RLS 가 authenticated 전체 SELECT 허용이라 별도 RPC 불필요.
 * (관제 화면 자체는 슈퍼관리자 게이트 뒤에 있음)
 */
import { getSupabase } from "@/lib/supabase/client"
import type { LiveEntry } from "./trackerControlTypes"

/** 이 시간 안에 위치 갱신이 있으면 '라이브'로 집계 */
export const LIVE_WINDOW_MS = 15 * 60 * 1000

export interface LiveAdventure {
  id: string
  title: string
  mountain_name: string
  is_solo: boolean
  trail_id: string | null
  started_at: string | null
  status: string
  /** 최근 LIVE_WINDOW_MS 내 위치를 보낸 인원 */
  live_count: number
  /** 전체 라이브 참가 인원 (오래된 포함) */
  total_count: number
  last_seen: string | null
}

interface LiveRow {
  user_id: string
  nickname: string
  avatar_url: string | null
  lat: number | null
  lng: number | null
  stamp_count: number | null
  hidden: boolean
  last_seen: string | null
}

export const liveAdventureRepo = {
  /** 모험중 세션 목록 — 시작됐고 아직 완료/취소되지 않은 세션 */
  async listLiveAdventures(): Promise<LiveAdventure[]> {
    const { data, error } = await getSupabase()
      .from("hiking_sessions")
      .select(
        "id, title, mountain_name, is_solo, trail_id, started_at, status, live:hiking_session_live_participants(user_id, last_seen)",
      )
      .not("started_at", "is", null)
      .in("status", ["open", "closed"])
      .order("started_at", { ascending: false })
      .limit(50)
    if (error) throw error

    const now = Date.now()
    return (data ?? []).map((row) => {
      const r = row as Record<string, unknown>
      const live = (r.live ?? []) as { user_id: string; last_seen: string | null }[]
      const seens = live
        .map((l) => (l.last_seen ? new Date(l.last_seen).getTime() : 0))
        .filter((t) => t > 0)
      return {
        id: String(r.id),
        title: String(r.title ?? ""),
        mountain_name: String(r.mountain_name ?? ""),
        is_solo: Boolean(r.is_solo),
        trail_id: r.trail_id == null ? null : String(r.trail_id),
        started_at: typeof r.started_at === "string" ? r.started_at : null,
        status: String(r.status ?? ""),
        live_count: seens.filter((t) => now - t < LIVE_WINDOW_MS).length,
        total_count: live.length,
        last_seen: seens.length
          ? new Date(Math.max(...seens)).toISOString()
          : null,
      }
    })
  },

  async getSession(sessionId: string): Promise<{
    id: string
    title: string
    mountain_name: string
    is_solo: boolean
    trail_id: string | null
    started_at: string | null
    status: string
  } | null> {
    const { data, error } = await getSupabase()
      .from("hiking_sessions")
      .select("id, title, mountain_name, is_solo, trail_id, started_at, status")
      .eq("id", sessionId)
      .maybeSingle()
    if (error) throw error
    return (data as never) ?? null
  },

  /** 세션 라이브 참가자 위치 → 관제 공용 LiveEntry 로 매핑 (위치 숨김 참가자 제외) */
  async listSessionLive(sessionId: string): Promise<LiveEntry[]> {
    const { data, error } = await getSupabase()
      .from("hiking_session_live_participants")
      .select(
        "user_id, nickname, avatar_url, lat, lng, stamp_count, hidden, last_seen",
      )
      .eq("session_id", sessionId)
    if (error) throw error
    return ((data ?? []) as LiveRow[])
      .filter((r) => !r.hidden)
      .map((r) => ({
        entry_id: r.user_id,
        display_name: r.nickname,
        bib_no: null,
        category: null,
        avatar_url: r.avatar_url,
        lat: r.lat,
        lng: r.lng,
        recorded_at: r.last_seen,
        speed_kmh: null,
      }))
  },

  /** 코스 체크포인트 (프로필/지도 시설 표시용) */
  async listCheckpoints(trailId: string) {
    const { data, error } = await getSupabase()
      .from("trail_checkpoints")
      .select("title, lat, lng, sort_order, marker_icon")
      .eq("trail_id", trailId)
      .order("sort_order")
    if (error) throw error
    return (data ?? []) as {
      title: string
      lat: number
      lng: number
      sort_order: number
      marker_icon: string | null
    }[]
  },
}
