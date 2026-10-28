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
        "flex items-center gap-3 whitespace-nowrap rounded-xl bg-gradient-to-r from-[#5c1224] to-[#DC2F55] px-4 py-2 text-white shadow-xl md:gap-5 md:px-6 md:py-3 " +
        (className ?? "")
      }
    >
      <span className="text-sm font-extrabold tracking-tight md:text-lg">
        레이스 종료
      </span>
      <span className="h-6 w-px bg-white/30 md:h-8" />
      <span className="flex items-baseline gap-1.5">
        <span className="text-xs font-medium text-white/80">스타터</span>
        <span className="text-base font-extrabold tabular-nums md:text-xl">{starters}</span>
      </span>
      <span className="flex items-baseline gap-1.5">
        <span className="text-xs font-medium text-white/80">DNF</span>
        <span className="text-base font-extrabold tabular-nums md:text-xl">{dnf}</span>
      </span>
      <span className="flex items-baseline gap-1.5">
        <span className="text-xs font-medium text-white/80">완주자</span>
        <span className="text-base font-extrabold tabular-nums md:text-xl">
          {finishers}
        </span>
      </span>
    </div>
  )
}
