"use client"

import { useMemo, useState } from "react"
import { ChevronsDown, ChevronsUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  CHECKPOINT_MARKER_ICONS,
  DEFAULT_MARKER_ICON,
} from "@/lib/checkpoint-marker-icons"
import {
  type CourseIndex,
  type RankedEntry,
  courseEleAt,
  projectPointOnCourse,
} from "@/lib/course-progress"
import type { EventCourseCheckpoint } from "@/lib/repos/trackerControlTypes"
import { categoryColor } from "./LiveMap"

export type ElevationProfileProps = {
  index: CourseIndex
  entries: RankedEntry[]
  categories: string[]
  checkpoints?: EventCourseCheckpoint[]
  selectedId?: string | null
  onSelect?: (entryId: string) => void
  /** 확대 보기 여부 (페이지가 컨테이너 높이와 함께 관리) */
  expanded?: boolean
  onToggleExpanded?: () => void
  className?: string
}

const SAMPLES = 240 // 프로필 다운샘플 점 수
// viewBox 0 0 1000 100 기준 세로 배치 — 위 12% / 그래프 60% / 아래 28%(체크포인트 라벨 영역)
const TOP = 12
const SPAN = 60

/** 시설(마커 아이콘) 한글 라벨 — 지도만들기 에디터의 아이콘 종류와 동일 */
const ICON_LABELS: Record<string, string> = {
  "flag-outline": "체크포인트",
  "water-outline": "급수",
  "restaurant-outline": "식사",
  "cafe-outline": "간식",
  restroom: "화장실",
  "bed-outline": "휴식",
  "home-outline": "대피소",
  "camera-outline": "포토스팟",
  "car-outline": "주차장",
  "business-outline": "편의시설",
  "bonfire-outline": "캠프",
  "navigate-outline": "갈림길",
  "leaf-outline": "자연",
  "alert-outline": "주의",
  "warning-outline": "위험구간",
}

/** 체크포인트 마커 아이콘 (lucide path 재사용) */
function CpIcon({ name, size = 13 }: { name: string | null; size?: number }) {
  const icon = CHECKPOINT_MARKER_ICONS[name ?? ""] ?? DEFAULT_MARKER_ICON
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={icon.color}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {icon.paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  )
}

/** 고도 축 눈금 간격 — 3~4개 선이 나오는 보기 좋은 단위 선택 */
function niceStep(range: number): number {
  for (const c of [10, 20, 25, 50, 100, 200, 250, 500, 1000]) {
    if (range / c <= 4) return c
  }
  return 2000
}

/**
 * 코스 고도 프로필 (UTMB/LiveTrail 스타일) —
 * 고도 눈금선, 체크포인트 시설 아이콘·라벨·필터, 참가자 위치 점, 거리·D+·D− 요약.
 * expanded 모드에서는 상단 헤더(시설 필터 칩 + 구분 범례)가 노출된다.
 */
export default function ElevationProfile({
  index,
  entries,
  categories,
  checkpoints,
  selectedId,
  onSelect,
  expanded = false,
  onToggleExpanded,
  className,
}: ElevationProfileProps) {
  const hasEle = index.totalAscentM != null
  // 숨긴 시설 아이콘 (기본 전부 표시)
  const [hiddenIcons, setHiddenIcons] = useState<Set<string>>(new Set())

  const { areaPath, minEle, maxEle } = useMemo(() => {
    let min = Infinity
    let max = -Infinity
    const ys: number[] = []
    for (let i = 0; i <= SAMPLES; i++) {
      const d = (i / SAMPLES) * index.totalM
      const e = hasEle ? (courseEleAt(index, d) ?? 0) : 0
      ys.push(e)
      if (e < min) min = e
      if (e > max) max = e
    }
    if (!hasEle || max - min < 1) {
      min = 0
      max = 1
    }
    const yOf = (e: number) => TOP + (1 - (e - min) / (max - min)) * SPAN
    let path = `M 0 ${hasEle ? yOf(ys[0]).toFixed(1) : "45"}`
    for (let i = 1; i <= SAMPLES; i++) {
      const x = (i / SAMPLES) * 1000
      path += ` L ${x.toFixed(1)} ${hasEle ? yOf(ys[i]).toFixed(1) : "45"}`
    }
    const area = path + ` L 1000 100 L 0 100 Z`
    return { areaPath: area, minEle: min, maxEle: max }
  }, [index, hasEle])

  const yPctOf = (e: number) =>
    TOP + (1 - (e - minEle) / (maxEle - minEle)) * SPAN

  const gridLevels = useMemo(() => {
    if (!hasEle) return []
    const step = niceStep(maxEle - minEle)
    const levels: number[] = []
    for (let e = Math.ceil(minEle / step) * step; e <= maxEle; e += step) {
      levels.push(e)
    }
    return levels
  }, [hasEle, minEle, maxEle])

  // 체크포인트를 코스에 투영해 진행거리 순으로 배치
  const cpMarks = useMemo(() => {
    if (!checkpoints?.length) return []
    return checkpoints
      .map((cp) => {
        const p = projectPointOnCourse(index, cp.lat, cp.lng)
        if (!p) return null
        const xPct = (p.progressM / index.totalM) * 100
        const e = hasEle ? (courseEleAt(index, p.progressM) ?? minEle) : minEle
        return {
          cp,
          icon: cp.marker_icon ?? "flag-outline",
          xPct,
          yPct: hasEle ? yPctOf(e) : 45,
          km: p.progressM / 1000,
        }
      })
      .filter((m): m is NonNullable<typeof m> => m !== null)
      .sort((a, b) => a.xPct - b.xPct)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkpoints, index, hasEle, minEle, maxEle])

  // 이 코스에 존재하는 시설 종류 (필터 칩)
  const iconKinds = useMemo(
    () => Array.from(new Set(cpMarks.map((m) => m.icon))),
    [cpMarks],
  )

  const toggleIcon = (icon: string) => {
    setHiddenIcons((prev) => {
      const next = new Set(prev)
      if (next.has(icon)) next.delete(icon)
      else next.add(icon)
      return next
    })
  }

  const dots = useMemo(
    () =>
      entries
        .filter((r) => r.progressM != null)
        .map((r) => {
          const d = Math.min(r.progressM as number, index.totalM)
          const xPct = (d / index.totalM) * 100
          const e = hasEle ? (courseEleAt(index, d) ?? minEle) : minEle
          return { r, xPct, yPct: hasEle ? yPctOf(e) : 45 }
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, index, hasEle, minEle, maxEle],
  )

  const summary =
    `${(index.totalM / 1000).toFixed(1)}km` +
    (index.totalAscentM != null ? ` · +${index.totalAscentM}m` : "") +
    (index.totalDescentM != null ? ` · −${index.totalDescentM}m` : "")

  return (
    <div className={"flex flex-col " + (className ?? "")}>
      {/* 확대 모드 헤더 — 시설 필터 칩 + 구분 범례 */}
      {expanded && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b px-3 py-2">
          <span className="text-xs font-bold">코스 프로필</span>
          <span className="text-xs tabular-nums text-muted-foreground">
            {summary}
          </span>
          {iconKinds.length > 0 && (
            <span className="flex flex-wrap items-center gap-1">
              {iconKinds.map((icon) => {
                const off = hiddenIcons.has(icon)
                return (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => toggleIcon(icon)}
                    className={
                      "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors " +
                      (off
                        ? "opacity-40"
                        : "border-foreground/20 bg-foreground/[0.04]")
                    }
                  >
                    <CpIcon name={icon} size={12} />
                    {ICON_LABELS[icon] ?? icon}
                  </button>
                )
              })}
            </span>
          )}
          {categories.length > 0 && (
            <span className="ml-auto flex items-center gap-2 text-[11px] text-muted-foreground">
              {categories.map((c) => (
                <span key={c} className="flex items-center gap-1">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: categoryColor(c, categories) }}
                  />
                  {c}
                </span>
              ))}
            </span>
          )}
          {onToggleExpanded && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleExpanded}
              title="작게 보기"
              className={
                "h-6 w-6 " + (categories.length > 0 ? "" : "ml-auto")
              }
            >
              <ChevronsDown className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* 그래프 영역 — 좌우 여백으로 0%/100% 지점의 아바타 잘림 방지 */}
      <div className="relative mx-6 flex-1">
        {gridLevels.map((e) => (
          <div
            key={e}
            className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-foreground/10"
            style={{ top: `${yPctOf(e)}%` }}
          >
            <span className="absolute left-1.5 top-0 -translate-y-full text-[9px] leading-tight text-muted-foreground/80">
              {e}m
            </span>
          </div>
        ))}

        <svg
          viewBox="0 0 1000 100"
          preserveAspectRatio="none"
          className="h-full w-full"
        >
          <defs>
            <linearGradient id="ep-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#DC2F55" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#DC2F55" stopOpacity="0.04" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#ep-fill)" />
          <path
            d={areaPath.replace(/ L 1000 100 L 0 100 Z$/, "")}
            fill="none"
            stroke="#FF5C7E"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* 체크포인트 — 세로 점선 + 하단 라벨은 항상, 시설 아이콘만 필터로 숨김 */}
        {cpMarks.map(({ cp, icon, xPct, yPct, km }, i) => (
          <div key={`${cp.sort_order}-${i}`}>
            <div
              className="pointer-events-none absolute border-l border-dashed border-foreground/25"
              style={{ left: `${xPct}%`, top: `${yPct}%`, bottom: "18%" }}
            />
            {!hiddenIcons.has(icon) ? (
              <div
                className="pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md border border-foreground/15 bg-background p-0.5 shadow"
                style={{ left: `${xPct}%`, top: `${yPct}%` }}
                title={cp.title}
              >
                <CpIcon name={icon} size={expanded ? 16 : 12} />
              </div>
            ) : (
              // 아이콘 숨김 상태 — 점선 기준점만 작은 점으로 유지
              <div
                className="pointer-events-none absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/40"
                style={{ left: `${xPct}%`, top: `${yPct}%` }}
              />
            )}
            <div
              className="pointer-events-none absolute bottom-1 max-w-28 -translate-x-1/2 text-center leading-tight"
              style={{ left: `${xPct}%` }}
            >
              <p className="truncate text-[9px] font-semibold text-foreground/90">
                {cp.title}
              </p>
              <p className="text-[9px] tabular-nums text-muted-foreground">
                {km.toFixed(1)}km
              </p>
            </div>
          </div>
        ))}

        {/* 참가자 위치 — 프로필 사진(없으면 이름 첫 글자) 원, 테두리는 구분 색 */}
        {dots.map(({ r, xPct, yPct }) => {
          const selected = selectedId === r.entry.entry_id
          const color =
            r.status === "sos"
              ? "#dc2626"
              : categoryColor(r.entry.category, categories)
          const size = expanded
            ? selected
              ? "h-8 w-8 text-[13px]"
              : "h-7 w-7 text-[12px]"
            : selected
              ? "h-5 w-5 text-[10px]"
              : "h-4 w-4 text-[9px]"
          return (
            <button
              key={r.entry.entry_id}
              type="button"
              title={`${r.entry.bib_no ? `#${r.entry.bib_no} ` : ""}${r.entry.display_name}`}
              onClick={() => onSelect?.(r.entry.entry_id)}
              className={
                "absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full font-bold text-white shadow " +
                size +
                (selected ? " z-10 ring-2 ring-foreground/40" : "") +
                (r.status === "sos" ? " animate-pulse" : "") +
                ((r.status === "stale" || r.status === "noSignal") &&
                !r.finished
                  ? " opacity-50"
                  : "")
              }
              style={{
                left: `${xPct}%`,
                top: `${yPct}%`,
                background: color,
                border: `2px solid ${color}`,
              }}
            >
              {r.entry.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.entry.avatar_url}
                  alt={r.entry.display_name}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                r.entry.display_name.slice(0, 1)
              )}
            </button>
          )
        })}

        {/* 작은(스트립) 모드: 우상단 요약 + 확대 버튼 */}
        {!expanded && (
          <>
            <span className="pointer-events-none absolute right-8 top-1 text-[10px] font-semibold tabular-nums text-foreground/80">
              {summary}
            </span>
            {onToggleExpanded && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleExpanded}
                title="크게 보기"
                className="absolute right-1 top-0.5 h-6 w-6"
              >
                <ChevronsUp className="h-4 w-4" />
              </Button>
            )}
          </>
        )}

        {/* 거리 라벨 */}
        <span className="pointer-events-none absolute bottom-1 left-2 text-[10px] font-medium text-muted-foreground">
          0km
        </span>
        <span className="pointer-events-none absolute bottom-1 right-2 text-[10px] font-medium tabular-nums text-muted-foreground">
          {(index.totalM / 1000).toFixed(1)}km
        </span>
      </div>
    </div>
  )
}
