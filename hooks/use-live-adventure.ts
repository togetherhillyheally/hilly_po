"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import {
  type CourseIndex,
  type ProgressState,
  type RankedEntry,
  buildCourseIndex,
  rankEntries,
} from "@/lib/course-progress"
import { liveAdventureRepo } from "@/lib/repos/liveAdventureRepo"
import { trailRepo } from "@/lib/repos/trailRepo"
import type { EventCourse } from "@/lib/repos/trackerControlTypes"

const POLL_MS = 5_000

export interface UseLiveAdventureResult {
  session: Awaited<ReturnType<typeof liveAdventureRepo.getSession>>
  course: EventCourse | null
  courseIndex: CourseIndex | null
  ranked: RankedEntry[]
  lastPolledAt: number | null
  notFound: boolean
  loading: boolean
}

/** 앱 모험(hiking_session) 라이브 관제 폴링 훅 — 트래커 이벤트 훅과 동일한 RankedEntry 파이프라인 */
export function useLiveAdventure(sessionId: string): UseLiveAdventureResult {
  const [session, setSession] =
    useState<UseLiveAdventureResult["session"]>(null)
  const [course, setCourse] = useState<EventCourse | null>(null)
  const [ranked, setRanked] = useState<RankedEntry[]>([])
  const [lastPolledAt, setLastPolledAt] = useState<number | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)

  const progressMapRef = useRef<Map<string, ProgressState>>(new Map())
  const toastedRef = useRef(false)

  const courseIndex = useMemo(
    () => (course?.coordinates ? buildCourseIndex(course.coordinates) : null),
    [course],
  )
  const courseIndexRef = useRef<CourseIndex | null>(null)
  courseIndexRef.current = courseIndex
  const startsAtMsRef = useRef<number | null>(null)
  startsAtMsRef.current = session?.started_at
    ? new Date(session.started_at).getTime()
    : null

  // 세션 + 코스 로드 (최초 1회)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setNotFound(false)
    ;(async () => {
      const s = await liveAdventureRepo.getSession(sessionId)
      if (cancelled) return
      if (!s) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setSession(s)
      if (s.trail_id) {
        try {
          const [trail, checkpoints] = await Promise.all([
            trailRepo.getTrailById(s.trail_id),
            liveAdventureRepo.listCheckpoints(s.trail_id),
          ])
          if (!cancelled && trail?.coordinates) {
            setCourse({
              name: trail.name,
              distance_km: trail.distance_km,
              bounds: trail.bounds,
              center: trail.center,
              coordinates: trail.coordinates,
              checkpoints,
            })
          }
        } catch {
          // 코스 로드 실패 — 위치만 표시 (모니터 모드)
        }
      }
      if (!cancelled) setLoading(false)
    })().catch(() => {
      if (!cancelled) {
        setNotFound(true)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [sessionId])

  const poll = useCallback(async () => {
    if (document.visibilityState === "hidden") return
    try {
      const entries = await liveAdventureRepo.listSessionLive(sessionId)
      setRanked(
        rankEntries(
          entries,
          courseIndexRef.current,
          progressMapRef.current,
          Date.now(),
          startsAtMsRef.current,
        ),
      )
      setLastPolledAt(Date.now())
      toastedRef.current = false
    } catch {
      if (!toastedRef.current) {
        toastedRef.current = true
        toast.error("실시간 데이터를 불러오지 못했어요. 자동으로 재시도해요.")
      }
    }
  }, [sessionId])

  useEffect(() => {
    if (loading || notFound) return
    poll()
    const timer = setInterval(poll, POLL_MS)
    const onVisible = () => {
      if (document.visibilityState === "visible") poll()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [loading, notFound, poll])

  return { session, course, courseIndex, ranked, lastPolledAt, notFound, loading }
}
