"use client"

import { useMemo, useState } from "react"
import { ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

/** 코스 이름에서 모두에게 공통인 앞 단어를 뺀 짧은 이름 — "2026 UTNP 9Peak" → "9Peak" */
function shortNames(names: string[]): string[] {
  if (names.length < 2) return names
  const split = names.map((n) => n.trim().split(/\s+/))
  let common = 0
  while (
    split.every((w) => w.length > common + 1) &&
    split.every((w) => w[common] === split[0][common])
  ) {
    common++
  }
  return split.map((w, i) => (common > 0 ? w.slice(common).join(" ") : names[i]))
}

/** 코스 선택 — 상단 지도/고도 전환과 같은 pill.
 *  3개까지는 나란히 버튼(세그먼트), 더 많으면 드롭다운 메뉴 */
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
  const labels = shortNames(courses.map((c) => c.name))
  const pill =
    "flex items-center gap-0.5 rounded-full border bg-background/85 p-0.5 shadow-lg backdrop-blur " +
    (className ?? "")

  if (courses.length <= 3) {
    return (
      <div className={pill} role="radiogroup" aria-label="지도 선택">
        {courses.map((c, i) => (
          <button
            key={c.id ?? i}
            type="button"
            role="radio"
            aria-checked={value === i}
            title={c.name}
            onClick={() => onChange(i)}
            className={
              "max-w-[28vw] truncate rounded-full px-3 py-1 text-xs font-medium transition-colors md:max-w-[160px] " +
              (value === i
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            {labels[i]}
          </button>
        ))}
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="지도 선택"
          className={pill + " px-3 py-1 text-xs font-medium text-foreground"}
        >
          <span className="max-w-[40vw] truncate md:max-w-[200px]">
            {labels[value]}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="theme-light">
        <DropdownMenuRadioGroup
          value={String(value)}
          onValueChange={(v) => onChange(Number(v))}
        >
          {courses.map((c, i) => (
            <DropdownMenuRadioItem key={c.id ?? i} value={String(i)} className="text-xs">
              {c.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
