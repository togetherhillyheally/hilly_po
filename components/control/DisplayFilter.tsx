"use client"

import { Map as MapIcon, Mountain, Star } from "lucide-react"
import type { RankedEntry } from "@/lib/course-progress"

/** 메인 화면 모드 — 지도+목록 / 고도 프로필+목록 */
export type ViewMode = "map" | "profile"

export function ViewModeSwitch({
  mode,
  onChange,
  className,
}: {
  mode: ViewMode
  onChange: (mode: ViewMode) => void
  className?: string
}) {
  const options: { value: ViewMode; label: string; icon: React.ReactNode }[] = [
    { value: "map", label: "지도", icon: <MapIcon className="h-3 w-3" /> },
    {
      value: "profile",
      label: "고도",
      icon: <Mountain className="h-3 w-3" />,
    },
  ]
  return (
    <div
      className={
        "flex items-center gap-0.5 rounded-full border bg-background/85 p-0.5 shadow-lg backdrop-blur " +
        (className ?? "")
      }
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={
            "flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors " +
            (mode === o.value
              ? "bg-[#DC2F55] text-white"
              : "text-muted-foreground hover:text-foreground")
          }
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** 표시할 러너 선택 — 지도·고도·리스트가 모두 같은 필터를 따른다.
 *  "cat:이름" 은 구분(카테고리) 필터 */
export type DisplayMode = "all" | "leaders" | "favorites" | `cat:${string}`

/** 리더 = 구분별 상위 3명 (구분 없으면 전체 상위 5명). */
export function filterDisplayEntries(
  ranked: RankedEntry[],
  mode: DisplayMode,
  favs: Set<string>,
  categories: string[],
): RankedEntry[] {
  if (mode === "all") return ranked
  if (mode.startsWith("cat:")) {
    const cat = mode.slice(4)
    return ranked.filter((r) => r.entry.category === cat)
  }
  if (mode === "favorites")
    return ranked.filter((r) => favs.has(r.entry.entry_id))

  // leaders
  if (categories.length === 0) {
    return ranked.filter((r) => r.rank != null && r.rank <= 5)
  }
  const byCat = new Map<string, RankedEntry[]>()
  for (const r of ranked) {
    if (r.rank == null) continue
    const key = r.entry.category ?? ""
    const list = byCat.get(key) ?? []
    list.push(r)
    byCat.set(key, list)
  }
  const keep = new Set<string>()
  for (const list of byCat.values()) {
    list
      .sort((a, b) => (a.rank as number) - (b.rank as number))
      .slice(0, 3)
      .forEach((r) => keep.add(r.entry.entry_id))
  }
  return ranked.filter((r) => keep.has(r.entry.entry_id))
}

/** 2D(평면) ↔ 3D(지형) 지도 전환 토글 */
export function MapDimensionToggle({
  is3d,
  onChange,
  className,
}: {
  is3d: boolean
  onChange: (is3d: boolean) => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!is3d)}
      title={is3d ? "평면 지도로 전환" : "3D 지형으로 전환"}
      className={
        "rounded-full border bg-background/85 px-3 py-1 text-xs font-bold shadow-lg backdrop-blur transition-colors " +
        (is3d
          ? "text-[#DC2F55]"
          : "text-muted-foreground hover:text-foreground") +
        " " +
        (className ?? "")
      }
    >
      {is3d ? "3D" : "2D"}
    </button>
  )
}

export function DisplayFilterControl({
  mode,
  onChange,
  isRace,
  favCount,
  categories = [],
  className,
}: {
  mode: DisplayMode
  onChange: (mode: DisplayMode) => void
  isRace: boolean
  favCount: number
  /** 구분(카테고리) 옵션 — 전체/리더/⭐ 사이에 끼워 하나의 필터로 통합 */
  categories?: string[]
  className?: string
}) {
  const options: { value: DisplayMode; label: React.ReactNode }[] = [
    { value: "all", label: "전체" },
    ...categories.map((c) => ({
      value: `cat:${c}` as DisplayMode,
      label: c,
    })),
    ...(isRace
      ? [{ value: "leaders" as DisplayMode, label: "리더" }]
      : []),
    {
      value: "favorites",
      label: (
        <span className="flex items-center gap-1">
          <Star className="h-3 w-3 fill-current" />
          {favCount > 0 ? favCount : ""}
        </span>
      ),
    },
  ]
  return (
    <div
      className={
        "flex items-center gap-0.5 rounded-full border bg-background/85 p-0.5 shadow-lg backdrop-blur " +
        (className ?? "")
      }
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={
            "rounded-full px-3 py-1 text-xs font-medium transition-colors " +
            (mode === o.value
              ? "bg-[#DC2F55] text-white"
              : "text-muted-foreground hover:text-foreground")
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
