"use client"

import { useEffect, useState } from "react"

/** 경과 시계 — 1초마다 갱신. 출발 전엔 "출발까지" 카운트다운. 관전·관제·개인 중계가 같이 쓴다 */
export default function ElapsedClock({
  startsAt,
  stacked = false,
  className,
}: {
  startsAt: string
  /** 라벨을 작게 위에, 시각은 크게 — 모바일 시트 헤더용 */
  stacked?: boolean
  className?: string
}) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 1000)
    return () => clearInterval(t)
  }, [])
  const diff = Math.floor((Date.now() - new Date(startsAt).getTime()) / 1000)
  const pre = diff < 0
  const sec = Math.abs(diff)
  const pad = (n: number) => String(n).padStart(2, "0")
  const hms = `${pad(Math.floor(sec / 3600))}:${pad(Math.floor((sec % 3600) / 60))}:${pad(sec % 60)}`
  if (stacked) {
    return (
      <span className={"flex flex-col items-end leading-none " + (className ?? "")}>
        <span className="text-[10px] font-semibold text-muted-foreground">
          {pre ? "출발까지" : "경과"}
        </span>
        <span className="mt-1 text-lg font-bold tabular-nums text-foreground">{hms}</span>
      </span>
    )
  }
  return (
    <span className={(pre ? "font-semibold text-foreground/80 " : "") + (className ?? "")}>
      {pre ? "출발까지 " : "경과 "}
      <span className="tabular-nums">{hms}</span>
    </span>
  )
}
