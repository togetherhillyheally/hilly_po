"use client"

import { useEffect, useState } from "react"
import { getSupabase } from "@/lib/supabase/client"

const POLL_MS = 15_000

export interface ScoreboardSquad {
  id: string
  name: string
  color: string | null
  sort_order: number
  team_no: number | null
  member_ids: string[]
  score: number
  set_bonus: number
  point_ids: string[]
}

export interface ScoreboardTeam {
  team_no: number
  raw: number
  set_bonus: number
  score: number
  gift_open: boolean
  tickets: number
}

/** public_session_scoreboard — 앱 session_squad_scores + 사람별 점수·배점·프로필 */
export interface SessionScoreboard {
  score_mode: boolean
  tiers: number[]
  teams: ScoreboardTeam[]
  squads: ScoreboardSquad[]
  unassigned: { member_ids: string[]; score: number; point_ids: string[] }
  team: {
    raw: number
    set_bonus: number
    late_min: number
    penalty: number
    score: number
    tickets: number
    gift_open: boolean
  }
  goal: number | null
  gift_threshold: number | null
  points_by_user: Record<string, number>
  point_tiers: Record<string, number>
  total_points: number
  profiles: Record<string, { nickname: string | null; avatar_url: string | null }>
}

/** 앱 모험의 팀·조 점수판 폴링 (공개 — 로그인 없이도) — 배점형 코스가 아니면 null */
export function useSessionScoreboard(sessionId: string, enabled: boolean) {
  const [board, setBoard] = useState<SessionScoreboard | null>(null)

  useEffect(() => {
    if (!enabled) return
    let alive = true
    const load = async () => {
      if (document.visibilityState === "hidden") return
      const { data, error } = await getSupabase().rpc(
        "public_session_scoreboard",
        { p_session_id: sessionId },
      )
      if (!alive || error) return
      const b = data as SessionScoreboard | null
      setBoard(b && b.score_mode ? b : null)
    }
    load()
    const timer = setInterval(load, POLL_MS)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [sessionId, enabled])

  return board
}
