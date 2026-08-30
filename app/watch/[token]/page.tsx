"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import {
  type DisplayMode,
  type ViewMode,
  MapDimensionToggle,
  ViewModeSwitch,
  filterDisplayEntries,
} from "@/components/control/DisplayFilter"
import ElevationProfile from "@/components/control/ElevationProfile"
import LiveMap from "@/components/control/LiveMap"
import LiveSidebar from "@/components/control/LiveSidebar"
import LiveTableWide from "@/components/control/LiveTableWide"
import RaceFinishBanner from "@/components/control/RaceFinishBanner"
import { useFavorites } from "@/hooks/use-favorites"
import { useLiveEvent } from "@/hooks/use-live-event"

/** 경과 시간 시계 — 1초마다 갱신 */
function ElapsedClock({ startsAt }: { startsAt: string }) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 1000)
    return () => clearInterval(t)
  }, [])
  const sec = Math.max(
    0,
    Math.floor((Date.now() - new Date(startsAt).getTime()) / 1000),
  )
  const pad = (n: number) => String(n).padStart(2, "0")
  return (
    <span className="tabular-nums">
      {pad(Math.floor(sec / 3600))}:{pad(Math.floor((sec % 3600) / 60))}:
      {pad(sec % 60)}
    </span>
  )
}

/** 공개 관전 페이지 — 로그인 없이 접근 (middleware matcher 에서 제외됨).
 *  뷰 모드: 지도(풀스크린 지도 + 우측 사이드바) / 고도(UTMB 식 스크롤 페이지 — 프로필 + 순위 리스트).
 *  지도는 모드 전환 시에도 언마운트하지 않는다 (Mapbox map load 재과금 방지). */
export default function WatchPage() {
  const params = useParams<{ token: string }>()
  const { info, courseIndex, ranked, tails, notFound, loading } = useLiveEvent({
    token: params.token,
    mode: "public",
  })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focusSignal, setFocusSignal] = useState(0)
  const [displayMode, setDisplayMode] = useState<DisplayMode>("all")
  const [viewMode, setViewMode] = useState<ViewMode>("map")
  const [is3d, setIs3d] = useState(true)
  const [terrainElevations, setTerrainElevations] =
    useState<Map<string, number> | null>(null)
  const { favs, toggleFav } = useFavorites(params.token)

  // 같은 참가자를 다시 눌러도 지도가 다시 포커스되도록 신호 카운터 증가
  const handleSelect = (id: string) => {
    setSelectedId(id)
    setFocusSignal((n) => n + 1)
  }

  const categories = useMemo(
    () =>
      Array.from(
        new Set(ranked.map((r) => r.entry.category).filter(Boolean)),
      ) as string[],
    [ranked],
  )

  // 지도/프로필/꼬리에만 적용되는 표시 필터 (순위 목록은 전체 유지)
  const visible = useMemo(
    () => filterDisplayEntries(ranked, displayMode, favs, categories),
    [ranked, displayMode, favs, categories],
  )
  const visibleTails = useMemo(() => {
    if (displayMode === "all") return tails
    const ids = new Set(visible.map((r) => r.entry.entry_id))
    return tails.filter((t) => ids.has(t.entry_id))
  }, [tails, visible, displayMode])

  if (loading) {
    return (
      <main className="theme-light flex min-h-[100dvh] items-center justify-center bg-background text-sm text-muted-foreground">
        불러오는 중…
      </main>
    )
  }

  if (notFound || !info) {
    return (
      <main className="theme-light flex min-h-[100dvh] flex-col items-center justify-center bg-background px-6 text-center text-foreground">
        <h1 className="text-lg font-bold">종료되었거나 없는 이벤트예요</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          링크를 다시 확인해 주세요.
        </p>
      </main>
    )
  }

  const isRace = info.event_type === "race"
  const hasProfileView = isRace && courseIndex != null
  const showMap = viewMode === "map" || !hasProfileView

  return (
    <main className="theme-light relative min-h-[100dvh] w-full bg-background text-foreground">
      {/* 상단 중앙 — 뷰 전환만 */}
      {hasProfileView && (
        <div className="fixed left-1/2 top-4 z-30 -translate-x-1/2">
          <ViewModeSwitch mode={viewMode} onChange={setViewMode} />
        </div>
      )}

      {/* 레이스 종료 배너 — 지도 위쪽 가운데(컨트롤 아래) */}
      {isRace && info.status === "finished" && (
        <div className="fixed left-1/2 top-16 z-20 -translate-x-1/2">
          <RaceFinishBanner ranked={ranked} />
        </div>
      )}

      {/* ── 지도 모드 (숨겨도 언마운트하지 않음) ── */}
      <div className={showMap ? "absolute inset-0 overflow-hidden" : "hidden"}>
        <LiveMap
          bare
          course={info.trail}
          entries={visible}
          tails={visibleTails}
          categories={categories}
          selectedId={selectedId}
          onSelect={handleSelect}
          focusSignal={focusSignal}
          enable3d={is3d}
          onElevations={setTerrainElevations}
          height="100%"
          className="absolute inset-0"
        />

        {/* 좌상단 이벤트 정보 오버레이 */}
        <header className="absolute left-4 top-4 z-10 rounded-xl border bg-background/85 px-4 py-3 shadow-lg backdrop-blur">
          <p className="text-[10px] font-bold tracking-tight text-muted-foreground">
            HILLY HEALLY LIVE
          </p>
          <h1 className="text-base font-bold leading-tight">{info.title}</h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <span>{isRace ? "대회" : "실시간 위치"}</span>
            {info.trail?.name && <span>{info.trail.name}</span>}
            {courseIndex && (
              <span className="tabular-nums">
                {(courseIndex.totalM / 1000).toFixed(1)}km
              </span>
            )}
            {courseIndex?.totalAscentM != null && (
              <span className="tabular-nums">
                D+{courseIndex.totalAscentM}m
              </span>
            )}
            <span>{ranked.length}명</span>
            {info.status === "live" && info.starts_at && (
              <span>
                경과 <ElapsedClock startsAt={info.starts_at} />
              </span>
            )}
            {info.status === "finished" && <span>종료된 이벤트</span>}
          </p>
        </header>

        {/* 2D/3D — 우측 아래 */}
        <MapDimensionToggle
          is3d={is3d}
          onChange={setIs3d}
          className="absolute bottom-4 left-4 z-30"
        />

        <LiveSidebar
          ranked={ranked}
          eventType={info.event_type}
          isAdmin={false}
          categories={categories}
          selectedId={selectedId}
          onSelect={handleSelect}
          favs={favs}
          onToggleFav={toggleFav}
          terrainElevations={terrainElevations}
          displayMode={displayMode}
          onDisplayModeChange={setDisplayMode}
        />
      </div>

      {/* ── 고도 모드: UTMB 식 스크롤 페이지 (프로필 + 순위 리스트) ── */}
      {!showMap && hasProfileView && (
        <div
          className={
            "mx-auto w-full max-w-screen-2xl px-6 pb-10 " +
            (info.status === "finished" ? "pt-36" : "pt-16")
          }
        >
          <header className="mb-3">
            <p className="text-[10px] font-bold tracking-tight text-muted-foreground">
              HILLY HEALLY LIVE
            </p>
            <h1 className="text-lg font-bold leading-tight">{info.title}</h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              {info.trail?.name && <span>{info.trail.name}</span>}
              <span>{ranked.length}명</span>
              {info.status === "live" && info.starts_at && (
                <span>
                  경과 <ElapsedClock startsAt={info.starts_at} />
                </span>
              )}
            </p>
          </header>

          <div className="overflow-hidden rounded-2xl bg-background">
            <ElevationProfile
              index={courseIndex}
              entries={visible}
              categories={categories}
              checkpoints={info.trail?.checkpoints}
              selectedId={selectedId}
              onSelect={handleSelect}
              expanded
              className="h-[46dvh] min-h-[320px]"
            />
          </div>

          <div className="mt-5">
            <LiveTableWide
              ranked={ranked}
              eventType={info.event_type}
              isAdmin={false}
              categories={categories}
              selectedId={selectedId}
              onSelect={handleSelect}
              favs={favs}
              onToggleFav={toggleFav}
              displayMode={displayMode}
              onDisplayModeChange={setDisplayMode}
            />
          </div>
        </div>
      )}
    </main>
  )
}
