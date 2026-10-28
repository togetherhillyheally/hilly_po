/**
 * 앱 "모험중" 라이브 관제 — 공개 보기용 RPC(public_live_adventures / public_adventure_live).
 * 관제 화면은 로그인 없이도 보이므로 테이블 직접 조회 대신 SECURITY DEFINER RPC 를 쓴다.
 * (시작된 세션만, 위치 숨김 참가자는 서버에서 제외)
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
  hidden?: boolean
  last_seen: string | null
}

export const liveAdventureRepo = {
  /** 모험중 세션 목록 — 시작됐고 아직 완료/취소되지 않은 세션 */
  async listLiveAdventures(): Promise<LiveAdventure[]> {
    const { data, error } = await getSupabase().rpc("public_live_adventures")
    if (error) throw error
    return ((data ?? []) as LiveAdventure[]).map((r) => ({
      ...r,
      trail_id: r.trail_id ?? null,
      started_at: r.started_at ?? null,
      last_seen: r.last_seen ?? null,
    }))
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
    const { data, error } = await getSupabase().rpc("public_adventure_live", {
      p_session_id: sessionId,
    })
    if (error) throw error
    return ((data as { session?: never } | null)?.session as never) ?? null
  },

  /** 세션 라이브 참가자 위치 → 관제 공용 LiveEntry 로 매핑 (위치 숨김 참가자 제외) */
  async listSessionLive(sessionId: string): Promise<LiveEntry[]> {
    const { data, error } = await getSupabase().rpc("public_adventure_live", {
      p_session_id: sessionId,
    })
    if (error) throw error
    return (((data as { participants?: LiveRow[] } | null)?.participants ?? []) as LiveRow[])
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
