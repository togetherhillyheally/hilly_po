"use client"

import type { RankedEntry } from "@/lib/course-progress"

/** 레이스 종료 배너 (UTMB 스타일) — 스타터 / DNF / 완주자 요약 */
export default function RaceFinishBanner({
  ranked,
  className,
}: {
  ranked: RankedEntry[]
  className?: string
}) {
  const starters = ranked.length
  const finishers = ranked.filter((r) => r.finished).length
  const dnf = starters - finishers

  return (
    <div
      className={
        "flex items-center gap-5 rounded-xl bg-gradient-to-r from-[#5c1224] to-[#DC2F55] px-6 py-3 text-white shadow-xl " +
        (className ?? "")
      }
    >
      <span className="text-lg font-extrabold tracking-tight">
        레이스 종료
      </span>
      <span className="h-8 w-px bg-white/30" />
      <span className="flex items-baseline gap-1.5">
        <span className="text-xs font-medium text-white/80">스타터</span>
        <span className="text-xl font-extrabold tabular-nums">{starters}</span>
      </span>
      <span className="flex items-baseline gap-1.5">
        <span className="text-xs font-medium text-white/80">DNF</span>
        <span className="text-xl font-extrabold tabular-nums">{dnf}</span>
      </span>
      <span className="flex items-baseline gap-1.5">
        <span className="text-xs font-medium text-white/80">완주자</span>
        <span className="text-xl font-extrabold tabular-nums">
          {finishers}
        </span>
      </span>
    </div>
  )
}
