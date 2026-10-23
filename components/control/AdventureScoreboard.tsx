"use client"

import { useMemo, useState } from "react"
import { ChevronDown, ChevronRight, ChevronUp, Gift } from "lucide-react"
import type { SessionScoreboard } from "@/hooks/use-session-scoreboard"
import { TIER_COLOR, type ScoreTier } from "@/lib/events/gwanggyo-cps"
import { categoryColor } from "./LiveMap"

const SQUAD_FALLBACK = ["#4C7FA4", "#CE2B37", "#D9A441", "#6B9E78"]

export const teamLabel = (n: number) => `${n}팀`

/** 앱 모험의 팀·조 점수판 — 앱 LiveParticipantPanel 과 같은 구성 (전체 = 팀 순위 / N팀 = 조·조원) */
export default function AdventureScoreboard({
  board,
  categories,
  liveIds,
  selectedId,
  onSelect,
  className = "",
}: {
  board: SessionScoreboard
  /** 지도 마커 색과 같은 기준 (구분 = "N팀") */
  categories: string[]
  /** 지금 지도에 위치가 있는 참가자 — 눌러서 지도 이동 가능 */
  liveIds: Set<string>
  selectedId: string | null
  onSelect: (userId: string) => void
  className?: string
}) {
  const [open, setOpen] = useState(true)
  const [tab, setTab] = useState<"all" | number>("all")

  const total = board.total_points
  const teams = useMemo(
    () =>
      [...board.teams].sort(
        (a, b) => b.score - a.score || a.team_no - b.team_no,
      ),
    [board.teams],
  )
  const multiTeam = teams.length > 1
  const activeTab: "all" | number =
    multiTeam && (tab === "all" || teams.some((t) => t.team_no === tab))
      ? tab
      : multiTeam
        ? "all"
        : (teams[0]?.team_no ?? 1)

  const squadsOf = (n: number) =>
    board.squads
      .filter((s) => (s.team_no ?? 1) === n)
      .sort((a, b) => b.score - a.score)
  const late = board.team.penalty > 0
  const name = (uid: string) => board.profiles[uid]?.nickname ?? "참가자"
  const pts = (uid: string) => board.points_by_user[uid] ?? 0

  const tierCounts = (pointIds: string[]) => {
    const cnt = new Map<number, number>()
    new Set(pointIds).forEach((id) => {
      const t = board.point_tiers[id]
      if (t) cnt.set(t, (cnt.get(t) ?? 0) + 1)
    })
    return (
      <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
        {board.tiers.map((t) => {
          const n = cnt.get(t) ?? 0
          return (
            <span
              key={t}
              className="flex items-center gap-0.5"
              style={{ opacity: n > 0 ? 1 : 0.35 }}
            >
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full border border-white/80 text-[9px] font-black text-white"
                style={{
                  background: TIER_COLOR[t as ScoreTier] ?? "#94a3b8",
                }}
              >
                {t}
              </span>
              <span className="text-xs font-black tabular-nums">×{n}</span>
            </span>
          )
        })}
      </div>
    )
  }

  const memberRow = (uid: string) => {
    const p = board.profiles[uid]
    const canFocus = liveIds.has(uid)
    return (
      <button
        key={uid}
        type="button"
        disabled={!canFocus}
        onClick={() => onSelect(uid)}
        className={`flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm ${
          selectedId === uid ? "bg-muted" : canFocus ? "hover:bg-muted/60" : ""
        }`}
      >
        {p?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.avatar_url}
            alt=""
            className="h-6 w-6 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
            {name(uid).slice(0, 1)}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate">{name(uid)}</span>
        {!canFocus && (
          <span className="text-[10px] text-muted-foreground">위치 없음</span>
        )}
        <span className="font-semibold tabular-nums">{pts(uid)}점</span>
      </button>
    )
  }

  const teamView = (n: number) => {
    const t = board.teams.find((x) => x.team_no === n)
    const sqs = squadsOf(n)
    return (
      <div className="space-y-3">
        {t && (
          <div className="border-b pb-2">
            <div className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: categoryColor(teamLabel(n), categories) }}
              />
              <span className="text-sm font-black">{teamLabel(n)}</span>
              {t.gift_open && <Gift className="h-3.5 w-3.5 text-[#DC2F55]" />}
              <span className="ml-auto text-sm font-black tabular-nums">
                {t.score}점
                {t.set_bonus > 0 && (
                  <span className="ml-1 text-[11px] font-semibold text-muted-foreground">
                    (보너스 +{t.set_bonus})
                  </span>
                )}
                {late && (
                  <span className="ml-1 text-[11px] font-semibold text-muted-foreground">
                    · 감점 전 {t.raw + t.set_bonus}
                  </span>
                )}
              </span>
            </div>
            {tierCounts(sqs.flatMap((s) => s.point_ids))}
          </div>
        )}
        {sqs
          .filter((s) => s.member_ids.length > 0)
          .map((s, i) => (
            <div key={s.id}>
              <div className="flex items-center gap-1.5 py-0.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    background: s.color ?? SQUAD_FALLBACK[i % SQUAD_FALLBACK.length],
                  }}
                />
                <span className="text-[13px] font-extrabold">
                  {multiTeam ? s.name.replace(/^\d+팀\s*/, "") : s.name}
                </span>
                <span className="text-xs font-bold text-muted-foreground tabular-nums">
                  {new Set(s.point_ids).size}/{total}
                </span>
                <span className="ml-auto text-[13px] font-extrabold tabular-nums">
                  {s.score}점
                  {s.set_bonus > 0 && (
                    <span className="ml-1 text-[11px] font-semibold text-muted-foreground">
                      (보너스 +{s.set_bonus})
                    </span>
                  )}
                </span>
              </div>
              {[...s.member_ids]
                .sort((a, b) => pts(b) - pts(a))
                .map(memberRow)}
            </div>
          ))}
      </div>
    )
  }

  return (
    <div
      className={`flex w-[300px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border bg-background/95 shadow-lg backdrop-blur ${className}`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2.5 text-left"
      >
        <span className="h-2 w-2 animate-pulse rounded-full bg-[#DC2F55]" />
        <span className="text-sm font-bold">팀 점수판</span>
        {!open && multiTeam && (
          <span className="truncate text-xs text-muted-foreground">
            {teams
              .slice(0, 3)
              .map((t) => `${teamLabel(t.team_no)} ${t.score}`)
              .join(" · ")}
          </span>
        )}
        {open ? (
          <ChevronUp className="ml-auto h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <>
          {multiTeam && (
            <div className="flex gap-1.5 overflow-x-auto px-3 pb-2">
              {(["all", ...teams.map((t) => t.team_no)] as ("all" | number)[]).map(
                (k) => (
                  <button
                    key={String(k)}
                    type="button"
                    onClick={() => setTab(k)}
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs font-extrabold ${
                      k === activeTab
                        ? "border-foreground bg-foreground/10"
                        : "text-muted-foreground"
                    }`}
                  >
                    {k === "all" ? "전체" : teamLabel(k)}
                  </button>
                ),
              )}
            </div>
          )}

          <div className="max-h-[min(60vh,520px)] overflow-y-auto border-t px-3 py-2">
            {board.team.penalty > 0 && (
              <p className="mb-2 rounded-md bg-amber-500/10 px-2 py-1.5 text-[11px] leading-snug text-amber-700">
                제한 시간 {board.team.late_min}분 초과 — 팀마다 −
                {board.team.penalty.toLocaleString()}점 반영됨
              </p>
            )}

            {activeTab === "all" ? (
              <div>
                {teams.map((t, i) => {
                  const sqs = squadsOf(t.team_no)
                  const stamps = new Set(sqs.flatMap((s) => s.point_ids)).size
                  const members = sqs.reduce(
                    (n, s) => n + s.member_ids.length,
                    0,
                  )
                  return (
                    <button
                      key={t.team_no}
                      type="button"
                      onClick={() => setTab(t.team_no)}
                      className="flex w-full items-center gap-2 border-b py-2 text-left last:border-0 hover:bg-muted/40"
                    >
                      <span className="w-4 text-[13px] font-extrabold text-muted-foreground">
                        {i + 1}
                      </span>
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          background: categoryColor(
                            teamLabel(t.team_no),
                            categories,
                          ),
                        }}
                      />
                      <span className="text-sm font-black">
                        {teamLabel(t.team_no)}
                      </span>
                      {t.gift_open && (
                        <Gift className="h-3.5 w-3.5 text-[#DC2F55]" />
                      )}
                      <span className="text-[11px] text-muted-foreground">
                        {members}명
                      </span>
                      <span className="ml-auto text-xs font-bold text-muted-foreground tabular-nums">
                        {stamps}/{total}
                      </span>
                      <span className="min-w-[52px] text-right text-sm font-black tabular-nums">
                        {t.score}점
                        {late && (
                          <span className="block text-[10px] font-semibold text-muted-foreground">
                            감점 전 {t.raw + t.set_bonus}
                          </span>
                        )}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  )
                })}
              </div>
            ) : (
              teamView(activeTab)
            )}

            {board.unassigned.member_ids.length > 0 && (
              <div className="mt-3">
                <p className="py-1 text-xs font-extrabold text-muted-foreground">
                  조 미배정
                </p>
                {board.unassigned.member_ids.map(memberRow)}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
