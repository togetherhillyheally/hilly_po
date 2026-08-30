"use client"

import { useMemo, useState } from "react"
import { Check, Search, Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { type RankedEntry, formatGap } from "@/lib/course-progress"
import {
  type DisplayMode,
  DisplayFilterControl,
  filterDisplayEntries,
} from "./DisplayFilter"
import { categoryColor } from "./LiveMap"

export type LiveTableWideProps = {
  ranked: RankedEntry[]
  eventType: "race" | "monitor"
  isAdmin: boolean
  categories: string[]
  selectedId?: string | null
  onSelect?: (entryId: string) => void
  favs: Set<string>
  onToggleFav: (entryId: string) => void
  displayMode: DisplayMode
  onDisplayModeChange: (mode: DisplayMode) => void
}

function formatEtaTime(etaAt: number | null): string {
  if (etaAt == null) return "—"
  const d = new Date(etaAt)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function StatusCell({ r, selected }: { r: RankedEntry; selected: boolean }) {
  if (r.status === "sos") return <Badge variant="destructive">SOS</Badge>
  if (r.finished)
    return (
      <span
        title="도착"
        className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600"
      >
        <Check className="h-4 w-4 text-white" strokeWidth={3} />
      </span>
    )
  if (r.status === "noSignal" || r.status === "stale")
    return (
      <Badge
        variant="outline"
        className={
          "whitespace-nowrap " +
          (selected
            ? "border-white/60 text-white"
            : "border-red-500/60 bg-red-500/10 text-red-500")
        }
      >
        신호 없음
      </Badge>
    )
  if (r.status === "offCourse")
    return (
      <Badge
        variant="outline"
        className={
          "whitespace-nowrap " +
          (selected
            ? "border-white/60 text-white"
            : "border-amber-500/50 text-amber-500")
        }
      >
        코스 이탈
      </Badge>
    )
  return null
}

/** UTMB 리더보드식 와이드 테이블 — 고도(리스트) 뷰 전용 */
export default function LiveTableWide({
  ranked,
  eventType,
  isAdmin,
  categories,
  selectedId,
  onSelect,
  favs,
  onToggleFav,
  displayMode,
  onDisplayModeChange,
}: LiveTableWideProps) {
  const [query, setQuery] = useState("")
  const isRace = eventType === "race"

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = filterDisplayEntries(ranked, displayMode, favs, categories)
    const filtered = base.filter(
      (r) =>
        q === "" ||
        r.entry.display_name.toLowerCase().includes(q) ||
        (r.entry.bib_no ?? "").toLowerCase().includes(q),
    )
    return [...filtered].sort((a, b) => {
      if (isAdmin) {
        if (a.status === "sos" && b.status !== "sos") return -1
        if (b.status === "sos" && a.status !== "sos") return 1
      }
      if (a.rank != null && b.rank != null) return a.rank - b.rank
      if (a.rank != null) return -1
      if (b.rank != null) return 1
      return a.entry.display_name.localeCompare(b.entry.display_name)
    })
  }, [ranked, displayMode, favs, categories, query, isAdmin])

  return (
    <div>
      {/* 필터 + 검색 */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <DisplayFilterControl
          mode={displayMode}
          onChange={onDisplayModeChange}
          isRace={isRace}
          favCount={favs.size}
          categories={categories}
        />
        <div className="relative w-64 max-w-full">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름·배번 검색"
            className="h-8 rounded-full pl-8 text-sm"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-y-1 text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              {isRace && <th className="w-24 px-4 py-1 font-medium">등위</th>}
              <th className="px-3 py-1 font-medium">러너</th>
              {categories.length > 0 && (
                <th className="w-24 px-3 py-1 font-medium">구분</th>
              )}
              {isRace && (
                <th className="w-32 px-3 py-1 font-medium">진행</th>
              )}
              {isRace && (
                <th className="w-28 px-3 py-1 font-medium">도착 예상</th>
              )}
              {isRace && (
                <th className="w-32 px-3 py-1 font-medium">1위와의 차이</th>
              )}
              {isAdmin && (
                <th className="w-20 px-3 py-1 font-medium">배터리</th>
              )}
              <th className="w-28 px-3 py-1 font-medium">상태</th>
              <th className="w-12 px-3 py-1" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-10 text-center text-sm text-muted-foreground"
                >
                  표시할 참가자가 없어요.
                </td>
              </tr>
            )}
            {rows.map((r, i) => {
              const selected = selectedId === r.entry.entry_id
              const color = categoryColor(r.entry.category, categories)
              const fav = favs.has(r.entry.entry_id)
              const battery =
                isAdmin && r.entry.battery_mv != null
                  ? Math.min(
                      100,
                      Math.max(
                        0,
                        Math.round(((r.entry.battery_mv - 3500) / 700) * 100),
                      ),
                    )
                  : null
              const rowBg = selected
                ? "bg-gradient-to-r from-[#8a1b38] to-[#DC2F55] text-white"
                : i % 2 === 0
                  ? "bg-muted/60"
                  : "bg-transparent"
              const subText = selected
                ? "text-white/75"
                : "text-muted-foreground"
              return (
                <tr
                  key={r.entry.entry_id}
                  onClick={() => onSelect?.(r.entry.entry_id)}
                  className={"cursor-pointer transition-colors " + rowBg}
                >
                  {isRace && (
                    <td className="rounded-l-lg px-4 py-2.5 align-middle">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums " +
                            (selected
                              ? "bg-white text-[#DC2F55]"
                              : "border-2 border-foreground/70")
                          }
                        >
                          {r.rank ?? "—"}
                        </span>
                        {r.entry.category && r.categoryRank != null && (
                          <span className={"text-[11px] leading-tight " + subText}>
                            {r.entry.category}
                            <br />
                            <b
                              className={
                                selected ? "text-white" : "text-foreground"
                              }
                            >
                              {r.categoryRank}
                            </b>
                          </span>
                        )}
                      </div>
                    </td>
                  )}
                  <td
                    className={
                      "px-3 py-2.5 align-middle " + (isRace ? "" : "rounded-l-lg")
                    }
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 text-sm font-bold text-white"
                        style={{ borderColor: color, background: color }}
                      >
                        {r.entry.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={r.entry.avatar_url}
                            alt={r.entry.display_name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          r.entry.display_name.slice(0, 1)
                        )}
                      </span>
                      <span>
                        <span className="block font-bold">
                          {r.entry.display_name}
                        </span>
                        {r.entry.bib_no && (
                          <span className={"block text-xs " + subText}>
                            #{r.entry.bib_no}
                          </span>
                        )}
                      </span>
                    </div>
                  </td>
                  {categories.length > 0 && (
                    <td className="px-3 py-2.5 align-middle">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{
                            background: selected ? "#fff" : color,
                          }}
                        />
                        {r.entry.category ?? "—"}
                      </span>
                    </td>
                  )}
                  {isRace && (
                    <td className="px-3 py-2.5 align-middle tabular-nums">
                      {r.progressM != null
                        ? `${(r.progressM / 1000).toFixed(1)}km`
                        : "—"}
                      {r.ascentM != null && (
                        <span className={"ml-1.5 text-xs " + subText}>
                          ↑{Math.round(r.ascentM)}m
                        </span>
                      )}
                    </td>
                  )}
                  {isRace && (
                    <td className="px-3 py-2.5 align-middle tabular-nums">
                      {r.finished ? "—" : formatEtaTime(r.etaAt)}
                    </td>
                  )}
                  {isRace && (
                    <td className="px-3 py-2.5 align-middle font-medium tabular-nums">
                      {r.rank != null && r.rank > 1 ? formatGap(r.gapM) : ""}
                    </td>
                  )}
                  {isAdmin && (
                    <td className="px-3 py-2.5 align-middle tabular-nums">
                      {battery != null ? `${battery}%` : "—"}
                    </td>
                  )}
                  <td className="px-3 py-2.5 align-middle">
                    <StatusCell r={r} selected={selected} />
                  </td>
                  <td className="rounded-r-lg px-3 py-2.5 align-middle">
                    <span
                      role="button"
                      tabIndex={0}
                      title={fav ? "즐겨찾기 해제" : "즐겨찾기"}
                      onClick={(ev) => {
                        ev.stopPropagation()
                        onToggleFav(r.entry.entry_id)
                      }}
                      onKeyDown={(ev) => {
                        if (ev.key === "Enter" || ev.key === " ") {
                          ev.stopPropagation()
                          ev.preventDefault()
                          onToggleFav(r.entry.entry_id)
                        }
                      }}
                      className="inline-flex p-0.5"
                    >
                      <Star
                        className={
                          "h-4 w-4 " +
                          (fav
                            ? "fill-yellow-400 text-yellow-400"
                            : selected
                              ? "text-white/60 hover:text-white"
                              : "text-muted-foreground/40 hover:text-muted-foreground")
                        }
                      />
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
