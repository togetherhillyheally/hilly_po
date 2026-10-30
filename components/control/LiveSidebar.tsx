"use client"

import { useMemo, useState } from "react"
import {
  Check,
  ChevronsDown,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUp,
  Search,
  Star,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  isGpsWaiting,
  type RankedEntry,
  formatGap,
  nextEta,
  formatStationary,
  monitorSeverity,
} from "@/lib/course-progress"
import {
  type DisplayMode,
  DisplayFilterControl,
  filterDisplayEntries,
} from "./DisplayFilter"
import { entryColor, nameInitial } from "@/lib/entry-colors"

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
  /** 열림/접힘 변경 알림 — 페이지가 지도 위 다른 컨트롤 위치를 조정할 때 사용 */
  onOpenChange?: (open: boolean) => void
  /** 목록 항목 명칭 — 기본 "참가자", 전역 기기 관제는 "기기" */
  noun?: string
  /** 출발 전 — 신호 없음을 빨간 경고 대신 중립 "출발 대기"로 */
  preStart?: boolean
  /** 첫 위치를 아직 못 받음 — 빈 목록 문구 대신 로딩 표시 */
  loading?: boolean
  /** 모바일 하단 시트 맨 위에 넣을 이벤트 정보 — 지도 위 오버레이 대신 (데스크톱은 숨김) */
  mobileHeader?: React.ReactNode
}

/** 첫 위치를 받기 전 자리 표시 — "표시할 참가자가 없어요"가 잠깐 보이지 않게 */
function SkeletonRows() {
  return (
    <div aria-busy="true" aria-label="불러오는 중">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-2 border-b px-4 py-3">
          <span className="h-6 w-6 shrink-0 animate-pulse rounded-full bg-foreground/10" />
          <span className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-foreground/10" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-28 animate-pulse rounded bg-foreground/10" />
            <div className="h-3 w-44 animate-pulse rounded bg-foreground/[0.07]" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** 1~3위 카드 — 색 구분 없이 살짝 도드라진 배경만 */
const PODIUM_ROW = "bg-foreground/[0.04]"
/** 1~3위 순위 원 — 중립, 흰 바탕 + 얇은 테두리 + 옅은 그림자 (꽉 찬 검정 원 대신) */
const PODIUM_CIRCLE =
  "bg-background text-foreground ring-1 ring-inset ring-foreground/15 shadow-sm"

/** 기기가 %로 보고하면 그대로, 아니면 MT710 리튬셀 대략치(3500mV=0% ~ 4200mV=100%)로 환산 */
function batteryPercent(
  mv: number | null | undefined,
  pct?: number | null,
): string | null {
  if (pct != null) return `${pct}%`
  if (mv == null) return null
  const est = Math.min(100, Math.max(0, Math.round(((mv - 3500) / 700) * 100)))
  return `${est}%`
}

function StatusBadge({ r, preStart }: { r: RankedEntry; preStart?: boolean }) {
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
  if (isGpsWaiting(r.entry))
    return (
      <Badge
        variant="outline"
        title="기기 신호는 들어오는데 아직 GPS 위치가 안 잡혔어요 (실내·하늘 가림)"
        className="whitespace-nowrap border-amber-500/60 bg-amber-500/10 text-amber-600"
      >
        GPS 대기
      </Badge>
    )
  if (r.status === "noSignal" || r.status === "stale")
    return preStart ? (
      <Badge
        variant="outline"
        title="출발 전이라 기기가 아직 꺼져 있어요"
        className="whitespace-nowrap text-muted-foreground"
      >
        출발 대기
      </Badge>
    ) : (
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
  // 장시간 정지 — 신호는 정상인데 30분+ 같은 자리 (안전 관제의 핵심 경고)
  const stationary = formatStationary(r.stationarySec)
  if (stationary)
    return (
      <Badge
        variant="outline"
        className="whitespace-nowrap border-amber-500/60 bg-amber-500/10 text-amber-600"
      >
        {stationary}
      </Badge>
    )
  return null
}

/** "수신 n분 전" — 모니터 모드 전용 (1시간 이상은 시각으로) */
function formatReceivedAgo(recordedAt: string | null): string | null {
  if (!recordedAt) return null
  const ms = Date.now() - new Date(recordedAt).getTime()
  if (ms < 0) return null
  const min = Math.floor(ms / 60_000)
  if (min < 1) return "수신 방금"
  if (min < 60) return `수신 ${min}분 전`
  return `수신 ${Math.floor(min / 60)}시간 전`
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
        nameInitial(name)
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
  preStart,
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
  preStart?: boolean
}) {
  const dimmed =
    (r.status === "stale" || r.status === "noSignal") &&
    !r.finished &&
    !preStart
  const podium = isRace && r.rank != null && r.rank <= 3
  // 배터리는 관전 화면에도 보인다 (tracker_event_public_signals)
  const battery = batteryPercent(r.entry.battery_mv, r.entry.battery_pct)
  // 다음 CP(없으면 결승) 도착 예상
  const eta = isRace ? nextEta(r) : null
  // 레이스: 여기까지의 누적 상승 / 모니터: 현재 해발고도(지형 조회)
  const ascent = isRace && !dimmed ? r.ascentM : null
  const altitude = !isRace && !dimmed ? (terrainEle ?? null) : null
  const receivedAgo = !isRace ? formatReceivedAgo(r.entry.recorded_at) : null
  const color = entryColor(r.entry, categories)

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
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold tabular-nums " +
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
          {r.gameScore != null ? (
            <span className="text-sm font-bold tabular-nums text-[#DC2F55]">
              {r.gameScore}점
            </span>
          ) : (
            isRace &&
            r.rank != null &&
            r.rank > 1 && (
              <span className="text-xs tabular-nums text-muted-foreground">
                {/* "+431m" → "1위와 431m" (숫자만으론 뭔지 헷갈려서) — 이름보다 작고 옅게 */}
                {formatGap(r.gapM).startsWith("+")
                  ? `1위와 ${formatGap(r.gapM).slice(1)}`
                  : formatGap(r.gapM)}
              </span>
            )
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
        {r.stampCount != null && r.gameScore != null && (
          <span className="whitespace-nowrap">도장 {r.stampCount}개</span>
        )}
        {!isRace && r.distance24hKm != null && (
          <span className="whitespace-nowrap font-medium text-foreground/80">
            24h {r.distance24hKm.toFixed(1)}km
          </span>
        )}
        {!isRace && receivedAgo && (
          <span className="whitespace-nowrap">{receivedAgo}</span>
        )}
        {eta && (
          <span className="whitespace-nowrap" title={`${eta.where} 도착 예상 (지금까지 평균 페이스 기준)`}>
            {eta.where}{" "}
            <span className="font-medium text-foreground/80">{eta.when}</span>
          </span>
        )}
        {/* 배터리는 오른쪽 끝 (상태 배지 오른쪽) */}
        <span className="ml-auto flex items-center gap-2">
          <StatusBadge r={r} preStart={preStart} />
          {battery && (
            <span
              className={
                "whitespace-nowrap " +
                (r.lowBattery ? "font-semibold text-red-500" : "")
              }
            >
              🔋{battery}
              {r.lowBattery && " 부족"}
            </span>
          )}
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
  onOpenChange,
  noun = "참가자",
  preStart = false,
  loading = false,
  mobileHeader,
}: LiveSidebarProps) {
  const [open, _setOpen] = useState(true)
  const setOpen = (v: boolean) => {
    _setOpen(v)
    onOpenChange?.(v)
  }
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
      // 스탬프 게임 이벤트: 점수 내림차순이 곧 리더보드
      if (!isRace && (a.gameScore != null || b.gameScore != null)) {
        const diff = (b.gameScore ?? -1) - (a.gameScore ?? -1)
        if (diff !== 0) return diff
        return a.entry.display_name.localeCompare(b.entry.display_name)
      }
      // 모니터(상시 관제): 이상 상태 우선 — SOS > 신호없음 > 장시간 정지 > 배터리 부족 > 정상
      if (!isRace) {
        const sev = monitorSeverity(a) - monitorSeverity(b)
        if (sev !== 0) return sev
        return a.entry.display_name.localeCompare(b.entry.display_name)
      }
      if (a.rank != null && b.rank != null) return a.rank - b.rank
      if (a.rank != null) return -1
      if (b.rank != null) return 1
      return a.entry.display_name.localeCompare(b.entry.display_name)
    })
  }, [ranked, displayMode, favs, categories, query, isAdmin, isRace])

  const podiumRows = isRace
    ? rows
        .filter((r) => r.rank != null && r.rank <= 3)
        .sort((a, b) => (a.rank as number) - (b.rank as number))
    : []
  // 모니터 모드는 이상 상태 정렬이 즐겨찾기보다 우선 (SOS 가 ⭐ 아래로 내려가면 안 됨)
  const restRows = isRace
    ? rows
        .filter((r) => !(r.rank != null && r.rank <= 3))
        .sort((a, b) => {
          // 즐겨찾기 우선 (기존 정렬 유지한 안정 정렬)
          const fa = favs.has(a.entry.entry_id) ? 0 : 1
          const fb = favs.has(b.entry.entry_id) ? 0 : 1
          return fa - fb
        })
    : rows

  if (!inline && !open) {
    return (
      <>
        {/* 데스크톱: 우측 가장자리 « */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => setOpen(true)}
          title={noun + " 목록 열기"}
          className="absolute right-3 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 rounded-full bg-background/80 shadow-lg backdrop-blur md:flex"
        >
          <ChevronsLeft className="h-5 w-5" />
        </Button>
        {/* 모바일: 하단 중앙 리더보드 열기 버튼 */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full bg-background/85 px-4 shadow-lg backdrop-blur md:hidden"
        >
          <ChevronsUp className="mr-1.5 h-4 w-4" />
          {isRace ? "리더보드" : noun}
        </Button>
      </>
    )
  }

  return (
    <aside
      className={
        inline
          ? "relative flex w-full flex-col overflow-hidden rounded-2xl border bg-background"
          : // 모바일: 하단 시트(전폭·40% 높이 — 지도를 더 넓게) / 데스크톱: 우측 패널
            "absolute inset-x-0 bottom-0 z-20 flex h-[40%] flex-col rounded-t-2xl border-t bg-background/90 backdrop-blur " +
            "md:inset-y-0 md:left-auto md:right-0 md:h-auto md:w-[360px] md:max-w-[88vw] md:rounded-none md:border-l md:border-t-0"
      }
    >
      {!inline && (
        <>
          {/* 데스크톱: 좌측 가장자리 » (접혔을 때 « 와 같은 위치) */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setOpen(false)}
            title={noun + " 목록 접기"}
            className="absolute -left-5 top-1/2 z-30 hidden h-10 w-10 -translate-y-1/2 rounded-full bg-background/80 shadow-lg backdrop-blur md:flex"
          >
            <ChevronsRight className="h-5 w-5" />
          </Button>
          {/* 모바일: 시트 상단 중앙 접기 버튼 */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setOpen(false)}
            title="접기"
            className="absolute -top-4 left-1/2 z-30 h-8 w-12 -translate-x-1/2 rounded-full bg-background/85 shadow-lg backdrop-blur md:hidden"
          >
            <ChevronsDown className="h-4 w-4" />
          </Button>
        </>
      )}

      {mobileHeader && !inline && (
        <div className="border-b px-4 pb-2 pt-4 md:hidden">{mobileHeader}</div>
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
            {isRace ? "리더보드" : noun}
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
        {loading && rows.length === 0 && <SkeletonRows />}
        {!loading && rows.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            표시할 {noun}가 없어요.
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
                preStart={preStart}
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
            preStart={preStart}
          />
        ))}
      </div>
    </aside>
  )
}
