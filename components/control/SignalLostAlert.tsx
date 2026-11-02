"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, WifiOff } from "lucide-react"
import type { RankedEntry } from "@/lib/course-progress"

/** 이 시간 넘게 아무 신호도 없으면 경고 — 짧은 음영(수 분)은 목록의 '신호 없음'으로 충분하다 */
export const SIGNAL_LOST_ALERT_MS = 15 * 60 * 1000
const MAX_ROWS = 5

/** 마지막 신호 시각 — 위치 시각과 기기 접속 시각 중 늦은 쪽 */
function lastSignalMs(r: RankedEntry): number | null {
  const ts = [r.entry.recorded_at, r.entry.device_last_seen_at]
    .filter((v): v is string => !!v)
    .map((v) => new Date(v).getTime())
  return ts.length ? Math.max(...ts) : null
}

function formatSince(ms: number): string {
  const min = Math.floor(ms / 60_000)
  if (min < 60) return `${min}분째`
  const h = Math.floor(min / 60)
  return min % 60 ? `${h}시간 ${min % 60}분째` : `${h}시간째`
}

/**
 * 장시간 신호 끊김 경고 — 진행 중 관제에서 15분 넘게 소식 없는 참가자.
 * 2026-10-30 UTNP: #2 가 11:05 에 끊긴 뒤 21시간 동안 목록의 '신호 없음' 한 줄로만 보였다.
 * 바로 연락해 트래커를 껐다 켜 달라고 할 수 있게 지도 위에 띄운다.
 */
export default function SignalLostAlert({
  ranked,
  onSelect,
  className,
}: {
  ranked: RankedEntry[]
  onSelect: (entryId: string) => void
  className?: string
}) {
  const [open, setOpen] = useState(true)
  const now = Date.now()
  const lost = ranked
    .filter((r) => !r.finished && r.status !== "sos")
    .map((r) => ({ r, last: lastSignalMs(r) }))
    // 한 번도 신호가 없던 참가자는 '출발 대기' — 경고 대상이 아니다
    .filter((x): x is { r: RankedEntry; last: number } => x.last != null)
    .filter((x) => now - x.last > SIGNAL_LOST_ALERT_MS)
    .sort((a, b) => a.last - b.last)

  if (lost.length === 0) return null

  return (
    <div
      className={
        "overflow-hidden rounded-xl border border-amber-500 bg-amber-50 text-amber-950 shadow-lg " +
        (className ?? "")
      }
    >
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <WifiOff className="h-4 w-4 shrink-0 text-amber-600" />
        <span className="flex-1 text-sm font-extrabold">
          신호 끊김 {lost.length}명
        </span>
        <span className="text-[11px] text-amber-800">15분 이상</span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-amber-700" />
        ) : (
          <ChevronDown className="h-4 w-4 text-amber-700" />
        )}
      </button>
      {open && (
        <div className="border-t border-amber-200 px-1.5 py-1.5">
          {lost.slice(0, MAX_ROWS).map(({ r, last }) => (
            <button
              key={r.entry.entry_id}
              type="button"
              className="flex w-full items-baseline gap-2 rounded-md px-1.5 py-1 text-left hover:bg-amber-100"
              onClick={() => onSelect(r.entry.entry_id)}
            >
              <span className="min-w-0 flex-1 truncate text-sm font-bold">
                {r.entry.display_name}
              </span>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-amber-800">
                {formatSince(now - last)}
              </span>
              {r.entry.battery_pct != null && (
                <span className="shrink-0 text-[11px] tabular-nums text-amber-700">
                  배터리 {r.entry.battery_pct}%
                </span>
              )}
            </button>
          ))}
          {lost.length > MAX_ROWS && (
            <p className="px-1.5 py-0.5 text-[11px] text-amber-800">
              외 {lost.length - MAX_ROWS}명 — 목록에서 확인
            </p>
          )}
          <p className="mt-1 px-1.5 pb-0.5 text-[11px] leading-snug text-amber-800">
            참가자에게 연락해 트래커를 껐다 켜 달라고 해 주세요. 마지막 배터리가
            낮으면 방전일 수 있어요.
          </p>
        </div>
      )}
    </div>
  )
}
