"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import {
  type CourseIndex,
  type MovementAnchor,
  type ProgressState,
  type RankedEntry,
  buildCourseIndex,
  rankEntries,
} from "@/lib/course-progress"
import { trackerControlRepo } from "@/lib/repos/trackerControlRepo"
import type {
  PublicEventInfo,
  TailPoint,
} from "@/lib/repos/trackerControlTypes"

const ADMIN_POLL_MS = 5_000
const PUBLIC_POLL_MS = 10_000
const TAILS_POLL_MS = 30_000
const BACKOFF_MS = [5_000, 10_000, 30_000]

export interface UseLiveEventResult {
  info: PublicEventInfo | null
  courseIndex: CourseIndex | null
  ranked: RankedEntry[]
  tails: TailPoint[]
  lastPolledAt: number | null
  /** 이벤트를 찾을 수 없음(잘못된 토큰/보관됨) */
  notFound: boolean
  loading: boolean
}

/**
 * 관제/관전 공용 실시간 폴링 훅.
 * - mode "admin": admin_tracker_event_live_state 5초 폴링 (기기 정보/SOS 포함)
 * - mode "public": tracker_event_public_state 10초 폴링
 * 탭이 백그라운드면 일시정지, 에러 시 백오프 후 자동 복구.
 */
export function useLiveEvent(options: {
  token: string
  mode: "admin" | "public"
}): UseLiveEventResult {
  const { token, mode } = options
  const [info, setInfo] = useState<PublicEventInfo | null>(null)
  const [ranked, setRanked] = useState<RankedEntry[]>([])
  const [tails, setTails] = useState<TailPoint[]>([])
  // 조별 스탬프 점수 — 스탬프지도(코스 좌표 없는 trail) 연결 이벤트에서만
  const [scores, setScores] = useState<Map<
    string,
    { score: number; stampCount: number }
  > | null>(null)
  const [lastPolledAt, setLastPolledAt] = useState<number | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)

  const progressMapRef = useRef<Map<string, ProgressState>>(new Map())
  const movementMapRef = useRef<Map<string, MovementAnchor>>(new Map())
  const errorCountRef = useRef(0)
  const toastedRef = useRef(false)

  const courseIndex = useMemo(() => {
    if (!info?.trail?.coordinates || info.event_type !== "race") return null
    return buildCourseIndex(info.trail.coordinates)
  }, [info])
  const courseIndexRef = useRef<CourseIndex | null>(null)
  courseIndexRef.current = courseIndex
  const startsAtMsRef = useRef<number | null>(null)
  startsAtMsRef.current = info?.starts_at
    ? new Date(info.starts_at).getTime()
    : null

  // 이벤트 정보 + 코스 (최초 1회)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setNotFound(false)
    trackerControlRepo
      .publicEventInfo(token)
      .then((i) => {
        if (cancelled) return
        setInfo(i)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setNotFound(true)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const eventId = info?.id ?? null

  const poll = useCallback(async () => {
    if (document.visibilityState === "hidden") return
    try {
      let entries =
        mode === "admin" && eventId
          ? await trackerControlRepo.adminLiveState(eventId)
          : await trackerControlRepo.publicLiveState(token)
      if (mode !== "admin") {
        // 관전 응답엔 기기 수신 시각이 없어 따로 받는다 — 실패해도 위치 표시는 그대로
        const seen = await trackerControlRepo
          .publicSignals(token)
          .catch(() => null)
        if (seen)
          entries = entries.map((e) => ({
            ...e,
            device_last_seen_at: seen.get(e.entry_id) ?? null,
          }))
      }
      setRanked(
        rankEntries(
          entries,
          courseIndexRef.current,
          progressMapRef.current,
          Date.now(),
          startsAtMsRef.current,
          movementMapRef.current,
        ),
      )
      setLastPolledAt(Date.now())
      errorCountRef.current = 0
      toastedRef.current = false
    } catch {
      errorCountRef.current += 1
      if (!toastedRef.current) {
        toastedRef.current = true
        toast.error("실시간 데이터를 불러오지 못했어요. 자동으로 재시도해요.")
      }
    }
  }, [mode, eventId, token])

  // 상시 관제(모니터)는 긴 궤적(6시간)이 안전 확인에 유용 — 레이스는 30분
  const tailsMinutes = info?.event_type === "monitor" ? 360 : 30
  // 스탬프 게임 점수 집계 대상: trail 이 연결된 모니터 이벤트
  const hasStampGame = info?.event_type === "monitor" && info?.trail != null

  const pollScores = useCallback(async () => {
    if (!hasStampGame || document.visibilityState === "hidden") return
    try {
      const rows = await trackerControlRepo.eventStampScores(token)
      setScores(
        new Map(
          rows.map((r) => [
            r.entry_id,
            { score: r.score, stampCount: r.stamp_count },
          ]),
        ),
      )
    } catch {
      // 점수는 부가 정보 — 조용히 다음 주기에 재시도
    }
  }, [token, hasStampGame])

  useEffect(() => {
    if (!info || !hasStampGame) return
    pollScores()
    const timer = setInterval(pollScores, 15_000)
    return () => clearInterval(timer)
  }, [info, hasStampGame, pollScores])

  const pollTails = useCallback(async () => {
    if (document.visibilityState === "hidden") return
    try {
      setTails(await trackerControlRepo.eventTails(token, tailsMinutes))
    } catch {
      // 꼬리는 부가 정보 — 조용히 다음 주기에 재시도
    }
  }, [token, tailsMinutes])

  // 위치 폴링 (에러 시 백오프)
  useEffect(() => {
    if (!info) return
    let timer: ReturnType<typeof setTimeout> | null = null
    let stopped = false

    const tick = async () => {
      await poll()
      if (stopped) return
      const base = mode === "admin" ? ADMIN_POLL_MS : PUBLIC_POLL_MS
      const delay =
        errorCountRef.current > 0
          ? BACKOFF_MS[
              Math.min(errorCountRef.current - 1, BACKOFF_MS.length - 1)
            ]
          : base
      timer = setTimeout(tick, delay)
    }
    tick()

    const onVisible = () => {
      if (document.visibilityState === "visible") poll()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      stopped = true
      if (timer) clearTimeout(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [info, mode, poll])

  // 꼬리 폴링
  useEffect(() => {
    if (!info) return
    pollTails()
    const timer = setInterval(pollTails, TAILS_POLL_MS)
    return () => clearInterval(timer)
  }, [info, pollTails])

  // 점수 주입 — 점수 있는 이벤트면 RankedEntry 에 gameScore/stampCount 병합
  const rankedWithScores = useMemo(() => {
    if (!scores) return ranked
    return ranked.map((r) => {
      const sc = scores.get(r.entry.entry_id)
      return sc
        ? { ...r, gameScore: sc.score, stampCount: sc.stampCount }
        : r
    })
  }, [ranked, scores])

  return {
    info,
    courseIndex,
    ranked: rankedWithScores,
    tails,
    lastPolledAt,
    notFound,
    loading,
  }
}
