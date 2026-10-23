"use client"

// 관제 — 앱에서 보낸 SOS(session_sos_alerts) 중 이 이벤트 코스(trail)로 진행한 모험의 것만.
// 슈퍼관리자 RLS 로 직접 조회 + realtime 으로 새 SOS·해제 즉시 반영 (2026-10-23).
import { useCallback, useEffect, useState } from "react"
import { getSupabase } from "@/lib/supabase/client"

export type EventSosAlert = {
  id: string
  sessionId: string
  sessionTitle: string | null
  userId: string
  nickname: string | null
  lat: number | null
  lng: number | null
  note: string | null
  createdAt: string
  resolvedAt: string | null
}

type Row = {
  id: string
  session_id: string
  user_id: string
  lat: number | null
  lng: number | null
  note: string | null
  created_at: string
  resolved_at: string | null
  profiles: { nickname: string | null } | null
  hiking_sessions: { trail_id: string | null; title: string | null } | null
}

/**
 * @param trailId 이벤트 코스. 없으면 조회 안 함
 * @param since  이 시각 이후 SOS 만 (보통 이벤트 시작 6시간 전). 없으면 최근 24시간
 */
export function useEventSos(trailId: string | null | undefined, since: string | null | undefined) {
  const [alerts, setAlerts] = useState<EventSosAlert[]>([])

  const load = useCallback(async () => {
    if (!trailId) {
      setAlerts([])
      return
    }
    const from = since ?? new Date(Date.now() - 24 * 3600_000).toISOString()
    const { data, error } = await getSupabase()
      .from("session_sos_alerts")
      .select(
        "id, session_id, user_id, lat, lng, note, created_at, resolved_at, profiles!session_sos_alerts_user_id_fkey(nickname), hiking_sessions!inner(trail_id, title)",
      )
      .eq("hiking_sessions.trail_id", trailId)
      .gte("created_at", from)
      .order("created_at", { ascending: false })
      .limit(100)
    if (error) {
      console.warn("[관제 SOS] 조회 실패", error.message)
      return
    }
    setAlerts(
      ((data ?? []) as unknown as Row[]).map((r) => ({
        id: r.id,
        sessionId: r.session_id,
        sessionTitle: r.hiking_sessions?.title ?? null,
        userId: r.user_id,
        nickname: r.profiles?.nickname ?? null,
        lat: r.lat,
        lng: r.lng,
        note: r.note,
        createdAt: r.created_at,
        resolvedAt: r.resolved_at,
      })),
    )
  }, [trailId, since])

  useEffect(() => {
    void load()
    if (!trailId) return
    const sb = getSupabase()
    // 코스 필터는 realtime 에서 못 걸어서 테이블 전체 변경을 받고 다시 조회 (SOS 는 드물다)
    const channel = sb
      .channel(`control-sos:${trailId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "session_sos_alerts" }, () => {
        void load()
      })
      .subscribe()
    // realtime 이 끊겨도 놓치지 않게 30초 폴링 병행
    const id = setInterval(() => void load(), 30_000)
    return () => {
      clearInterval(id)
      void sb.removeChannel(channel)
    }
  }, [trailId, load])

  const resolve = useCallback(
    async (alertId: string) => {
      const { error } = await getSupabase().rpc("resolve_session_sos", { p_alert_id: alertId })
      if (error) throw new Error(error.message)
      await load()
    },
    [load],
  )

  return { alerts, open: alerts.filter((a) => !a.resolvedAt), resolve, reload: load }
}
