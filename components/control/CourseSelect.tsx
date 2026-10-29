"use client"

import { useMemo, useState } from "react"
import { ChevronDown } from "lucide-react"
import { type CourseIndex, buildProfileIndex } from "@/lib/course-progress"
import type {
  EventCourse,
  PublicEventInfo,
} from "@/lib/repos/trackerControlTypes"

/**
 * 관제 지도 선택 — 대표 코스(trail) + 추가 코스(extra_trails) 중 하나를 골라 지도·고도표에 표시.
 * 순위·진행률은 대표 코스 기준 그대로(courseIndex) — 다른 코스를 보는 동안 고도표엔 참가자 점을 숨긴다.
 */
export function useCourseChoice(
  info: PublicEventInfo | null,
  courseIndex: CourseIndex | null,
) {
  const courses = useMemo<EventCourse[]>(
    () => (info?.trail ? [info.trail, ...info.extra_trails] : []),
    [info],
  )
  const [activeIdx, setActiveIdx] = useState(0)
  const idx = activeIdx < courses.length ? activeIdx : 0
  const activeCourse = courses[idx] ?? null
  const isMain = idx === 0
  const profileIndex = useMemo(
    () =>
      isMain
        ? (courseIndex ?? buildProfileIndex(activeCourse?.coordinates))
        : buildProfileIndex(activeCourse?.coordinates),
    [isMain, courseIndex, activeCourse],
  )
  return { courses, activeIdx: idx, setActiveIdx, activeCourse, isMain, profileIndex }
}

/** 코스가 둘 이상일 때만 보이는 작은 선택 상자 — 하나면 이름만 */
export default function CourseSelect({
  courses,
  value,
  onChange,
  className,
}: {
  courses: EventCourse[]
  value: number
  onChange: (idx: number) => void
  className?: string
}) {
  if (courses.length === 0) return null
  if (courses.length === 1) {
    return <span className={className}>{courses[0].name}</span>
  }
  return (
    <span
      className={
        "relative inline-flex items-center rounded-full border border-foreground/15 bg-background/80 " +
        (className ?? "")
      }
    >
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="지도 선택"
        className="cursor-pointer appearance-none bg-transparent py-0.5 pl-2 pr-6 font-semibold text-foreground outline-none"
      >
        {courses.map((c, i) => (
          <option key={c.id ?? i} value={i}>
            {c.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-1.5 h-3 w-3 text-muted-foreground" />
    </span>
  )
}
