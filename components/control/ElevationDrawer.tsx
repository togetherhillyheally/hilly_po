"use client"

import { useState } from "react"
import { ChevronDown, Mountain } from "lucide-react"
import ElevationProfile from "@/components/control/ElevationProfile"
import type { CourseIndex, RankedEntry } from "@/lib/course-progress"
import type { EventCourseCheckpoint } from "@/lib/repos/trackerControlTypes"

/**
 * 지도 아래 고도표 — 지도를 보면서 접었다 펼 수 있는 하단 패널.
 * 위치는 부모가 className 으로 정한다. 모바일은 펼치면 하단 시트 윗변에 전폭으로 붙어
 * 시트의 연장처럼 보이고(atSheetTopClass), 데스크톱은 사이드바 왼쪽에 떠 있는 카드.
 * 코스(GPX)가 있는 지도에서만 쓴다.
 */
export default function ElevationDrawer({
  index,
  entries,
  categories,
  checkpoints,
  selectedId,
  onSelect,
  className,
  onOpenChange,
}: {
  index: CourseIndex
  entries: RankedEntry[]
  categories: string[]
  checkpoints?: EventCourseCheckpoint[]
  selectedId?: string | null
  onSelect?: (entryId: string) => void
  className?: string
  /** 열림/접힘 알림 — 모바일에서 페이지가 패널 폭·주변 컨트롤을 조정할 때 사용 */
  onOpenChange?: (open: boolean) => void
}) {
  const [open, _setOpen] = useState(false)
  const setOpen = (v: boolean) => {
    _setOpen(v)
    onOpenChange?.(v)
  }

  // 거리·상승·하강 — 그래프 위에 겹쳐 쓰지 않고 헤더에
  const summary =
    `${(index.totalM / 1000).toFixed(1)}km` +
    (index.totalAscentM != null ? ` · +${index.totalAscentM}m` : "") +
    (index.totalDescentM != null ? ` · −${index.totalDescentM}m` : "")

  if (!open) {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mr-auto flex items-center gap-1.5 rounded-full md:mx-auto border bg-background/90 px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-lg backdrop-blur hover:bg-background"
        >
          <Mountain className="h-3.5 w-3.5" />
          고도표
        </button>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="overflow-hidden rounded-t-2xl border border-b-0 bg-background/95 shadow-xl backdrop-blur md:rounded-xl md:border-b">
        <div className="flex items-center justify-between gap-2 border-b px-3 py-1.5">
          <span className="flex min-w-0 items-center gap-1.5 text-xs font-semibold">
            <Mountain className="h-3.5 w-3.5 shrink-0" />
            고도표
            <span className="truncate font-medium tabular-nums text-muted-foreground">
              {summary}
            </span>
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-1 text-xs text-muted-foreground hover:bg-muted"
            aria-label="고도표 접기"
          >
            접기
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
        <ElevationProfile
          index={index}
          entries={entries}
          categories={categories}
          checkpoints={checkpoints}
          selectedId={selectedId}
          onSelect={onSelect}
          compact
          className="h-[150px] md:h-[380px]"
        />
      </div>
    </div>
  )
}
