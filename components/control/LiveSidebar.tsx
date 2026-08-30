"use client"

import { useMemo, useState } from "react"
import { Check, ChevronsLeft, ChevronsRight, Search, Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { type RankedEntry, formatGap } from "@/lib/course-progress"
import {
  type DisplayMode,
  DisplayFilterControl,
  filterDisplayEntries,
} from "./DisplayFilter"
import { categoryColor } from "./LiveMap"

export type LiveSidebarProps = {
  ranked: RankedEntry[]
  eventType: "race" | "monitor"
  isAdmin: boolean
  categories: string[]
  selectedId?: string | null
  onSelect?: (entryId: string) => void
  /** 즐겨찾기 — 페이지(useFavorites)가 관리, 지도/프로필과 공유 */
  favs: Set<string>
  onToggleFav: (entryId: string) => void
  /** 지형(DEM) 기반 참가자별 해발고도(m) — 코스 고도 없을 때 보조 */
  terrainElevations?: Map<string, number> | null
  /** overlay(기본): 지도 위 우측 오버레이. inline: 스크롤 페이지 본문 삽입용 */
  variant?: "overlay" | "inline"
  /** 표시 필터(전체/리더/⭐) — 전달하면 헤더 타이틀 자리에 렌더 */
  displayMode?: DisplayMode
  onDisplayModeChange?: (mode: DisplayMode) => void
}

/** 1~3위 카드 — 색 구분 없이 살짝 도드라진 배경만 */
const PODIUM_ROW = "bg-foreground/[0.04]"
/** 1~3위 순위 원 — 중립(전경색 채움) */
const PODIUM_CIRCLE = "bg-foreground text-background"

/** MT710 리튬셀 대략치: 3500mV(0%) ~ 4200mV(100%) */
function batteryPercent(mv: number | null | undefined): string | null {
  if (mv == null) return null
  const pct = Math.min(100, Math.max(0, Math.round(((mv - 3500) / 700) * 100)))
  return `${pct}%`
}

function StatusBadge({ r }: { r: RankedEntry }) {
  if (r.status === "sos")
    return (
      <Badge variant="destructive" className="whitespace-nowrap">
        SOS
      </Badge>
    )
  // 도착자는 이후 신호가 끊겨도 '신호 없음' 대신 도착 체크 유지
  if (r.finished)
    return (
      <span
        title="도착"
        className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600"
      >
        <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
      </span>
    )
  if (r.status === "noSignal" || r.status === "stale")
    return (
      <Badge
        variant="outline"
        className="whitespace-nowrap border-red-500/60 bg-red-500/10 text-red-500"
      >
        신호 없음
      </Badge>
    )
  if (r.status === "offCourse")
    return (
      <Badge
        variant="outline"
        className="whitespace-nowrap border-amber-500/50 text-amber-500"
      >
        코스 이탈
      </Badge>
    )
  return null
}

function formatEta(etaAt: number | null): string | null {
  if (etaAt == null) return null
  const d = new Date(etaAt)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `도착 예상 ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 프로필 사진 원 — 없으면 이름 첫 글자, 테두리는 구분 색 */
function AvatarCircle({
  name,
  avatarUrl,
  color,
}: {
  name: string
  avatarUrl: string | null | undefined
  color: string
}) {
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 text-xs font-bold text-white"
      style={{ borderColor: color, background: color }}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={name}
          className="h-full w-full object-cover"
        />
      ) : (
        name.slice(0, 1)
      )}
    </span>
  )
}

function EntryRow({
  r,
  isRace,
  isAdmin,
  categories,
  selected,
  onSelect,
  fav,
  onToggleFav,
  terrainEle,
}: {
  r: RankedEntry
  isRace: boolean
  isAdmin: boolean
  categories: string[]
  selected: boolean
  onSelect?: (entryId: string) => void
  fav: boolean
  onToggleFav: (entryId: string) => void
  terrainEle?: number | null
}) {
  const dimmed =
    (r.status === "stale" || r.status === "noSignal") && !r.finished
  const podium = isRace && r.rank != null && r.rank <= 3
  const battery = isAdmin ? batteryPercent(r.entry.battery_mv) : null
  const eta = isRace ? formatEta(r.etaAt) : null
  // 레이스: 여기까지의 누적 상승 / 모니터: 현재 해발고도(지형 조회)
  const ascent = isRace && !dimmed ? r.ascentM : null
  const altitude = !isRace && !dimmed ? (terrainEle ?? null) : null
  const color = categoryColor(r.entry.category, categories)

  return (
    <button
      type="button"
      onClick={() => onSelect?.(r.entry.entry_id)}
      className={
        "block w-full border-b px-4 py-2.5 text-left transition-colors hover:bg-accent/50 " +
        (podium ? PODIUM_ROW + " " : "") +
        (selected ? "bg-accent " : "") +
        (r.status === "sos" && isAdmin ? "bg-red-500/10 " : "") +
        // 신호 없음: 흐림 대신 은은한 빨간 배경으로 강조
        (dimmed ? "bg-red-500/5" : "")
      }
    >
      <div className="flex items-center gap-2">
        {isRace &&
          (podium ? (
            <span
              className={
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums " +
                PODIUM_CIRCLE
              }
            >
              {r.rank}
            </span>
          ) : (
            <span className="w-6 shrink-0 text-center text-sm font-bold tabular-nums">
              {r.rank ?? "—"}
            </span>
          ))}
        <AvatarCircle
          name={r.entry.display_name}
          avatarUrl={r.entry.avatar_url}
          color={color}
        />
        {r.entry.bib_no && (
          <span className="shrink-0 text-xs text-muted-foreground">
            #{r.entry.bib_no}
          </span>
        )}
        <span
          className={
            "truncate font-medium " + (podium ? "text-[15px]" : "text-sm")
          }
        >
          {r.entry.display_name}
        </span>
        <span className="ml-auto shrink-0">
          {isRace && r.rank != null && r.rank > 1 && (
            <span className="text-sm tabular-nums">{formatGap(r.gapM)}</span>
          )}
        </span>
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
          className="shrink-0 p-0.5"
        >
          <Star
            className={
              "h-4 w-4 " +
              (fav
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/40 hover:text-muted-foreground")
            }
          />
        </span>
      </div>
      <div
        className={
          "mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground " +
          (isRace ? "pl-[68px]" : "pl-10")
        }
      >
        {r.entry.category && (
          <span className="whitespace-nowrap">
            {r.entry.category}
            {isRace && r.categoryRank != null && (
              <span className="font-semibold text-foreground/80">
                {" "}
                {r.categoryRank}위
              </span>
            )}
          </span>
        )}
        {isRace && r.progressM != null && (
          <span className="whitespace-nowrap font-medium text-foreground/80">
            {(r.progressM / 1000).toFixed(1)}km
          </span>
        )}
        {ascent != null && (
          <span className="whitespace-nowrap">↑{Math.round(ascent)}m</span>
        )}
        {altitude != null && (
          <span className="whitespace-nowrap">⛰{Math.round(altitude)}m</span>
        )}
        {!r.finished && eta && (
          <span className="whitespace-nowrap font-medium text-foreground/80">
            {eta}
          </span>
        )}
        {battery && <span className="whitespace-nowrap">🔋{battery}</span>}
        <span className="ml-auto">
          <StatusBadge r={r} />
        </span>
      </div>
    </button>
  )
}

/**
 * 지도 위 우측 오버레이 사이드바 — « / » 버튼으로 접고 펼침.
 * 레이스 모드는 상단에 TOP 3 영역을 분리해 메달 스타일로 표시.
 */
export default function LiveSidebar({
  ranked,
  eventType,
  isAdmin,
  categories,
  selectedId,
  onSelect,
  favs,
  onToggleFav,
  terrainElevations,
  variant = "overlay",
  displayMode,
  onDisplayModeChange,
}: LiveSidebarProps) {
  const [open, setOpen] = useState(true)
  const inline = variant === "inline"
  const [query, setQuery] = useState("")
  const isRace = eventType === "race"

  // 리스트도 지도/프로필과 같은 표시 필터를 따름 (필터 하나로 통합)
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base =
      displayMode != null
        ? filterDisplayEntries(ranked, displayMode, favs, categories)
        : ranked
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

  const podiumRows = isRace
    ? rows
        .filter((r) => r.rank != null && r.rank <= 3)
        .sort((a, b) => (a.rank as number) - (b.rank as number))
    : []
  const restRows = (
    isRace ? rows.filter((r) => !(r.rank != null && r.rank <= 3)) : rows
  ).sort((a, b) => {
    // 즐겨찾기 우선 (기존 정렬 유지한 안정 정렬)
    const fa = favs.has(a.entry.entry_id) ? 0 : 1
    const fb = favs.has(b.entry.entry_id) ? 0 : 1
    return fa - fb
  })

  if (!inline && !open) {
    return (
      <Button
        variant="outline"
        size="icon"
        onClick={() => setOpen(true)}
        title="참가자 목록 열기"
        className="absolute right-3 top-1/2 z-20 h-10 w-10 -translate-y-1/2 rounded-full bg-background/80 shadow-lg backdrop-blur"
      >
        <ChevronsLeft className="h-5 w-5" />
      </Button>
    )
  }

  return (
    <aside
      className={
        inline
          ? "relative flex w-full flex-col overflow-hidden rounded-2xl border bg-background"
          : "absolute bottom-0 right-0 top-0 z-20 flex w-[360px] max-w-[88vw] flex-col border-l bg-background/90 backdrop-blur"
      }
    >
      {/* 접기 버튼 — 접혔을 때의 « 버튼과 같은 위치(패널 가장자리 세로 중앙) */}
      {!inline && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => setOpen(false)}
          title="참가자 목록 접기"
          className="absolute -left-5 top-1/2 z-30 h-10 w-10 -translate-y-1/2 rounded-full bg-background/80 shadow-lg backdrop-blur"
        >
          <ChevronsRight className="h-5 w-5" />
        </Button>
      )}

      <div className="flex items-center border-b px-3 py-2.5">
        {displayMode && onDisplayModeChange ? (
          // 표시 필터가 헤더 타이틀 자리를 대신함
          <DisplayFilterControl
            mode={displayMode}
            onChange={onDisplayModeChange}
            isRace={isRace}
            favCount={favs.size}
            categories={categories}
            className="border-0 shadow-none"
          />
        ) : (
          <h2 className="px-1 text-sm font-bold">
            {isRace ? "리더보드" : "참가자"}
          </h2>
        )}
      </div>

      <div className="border-b px-3 py-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름·배번 검색"
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>

      <div className={inline ? "" : "flex-1 overflow-y-auto"}>
        {rows.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            표시할 참가자가 없어요.
          </p>
        )}

        {podiumRows.length > 0 && (
          <div className="border-b-2">
            <p className="px-4 pb-1 pt-2.5 text-[10px] font-bold tracking-widest text-muted-foreground">
              TOP 3
            </p>
            {podiumRows.map((r) => (
              <EntryRow
                key={r.entry.entry_id}
                r={r}
                isRace={isRace}
                isAdmin={isAdmin}
                categories={categories}
                selected={selectedId === r.entry.entry_id}
                onSelect={onSelect}
                fav={favs.has(r.entry.entry_id)}
                onToggleFav={onToggleFav}
                terrainEle={terrainElevations?.get(r.entry.entry_id)}
              />
            ))}
          </div>
        )}

        {restRows.map((r) => (
          <EntryRow
            key={r.entry.entry_id}
            r={r}
            isRace={isRace}
            isAdmin={isAdmin}
            categories={categories}
            selected={selectedId === r.entry.entry_id}
            onSelect={onSelect}
            fav={favs.has(r.entry.entry_id)}
            onToggleFav={onToggleFav}
            terrainEle={terrainElevations?.get(r.entry.entry_id)}
          />
        ))}
      </div>
    </aside>
  )
}
