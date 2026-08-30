"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { useFavorites } from "@/hooks/use-favorites"
import { useLiveAdventure } from "@/hooks/use-live-adventure"
import { useSuperAdmin } from "@/hooks/use-super-admin"

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

/** 앱 "모험중" 세션 라이브 관제 — 트래커 이벤트 관제와 동일한 화면 구성 (슈퍼관리자 전용) */
export default function LiveAdventureControlPage() {
  const params = useParams<{ id: string }>()
  const { isAdmin } = useSuperAdmin()
  const { session, course, courseIndex, ranked, notFound, loading } =
    useLiveAdventure(params.id)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focusSignal, setFocusSignal] = useState(0)
  const [displayMode, setDisplayMode] = useState<DisplayMode>("all")
  const [viewMode, setViewMode] = useState<ViewMode>("map")
  const [is3d, setIs3d] = useState(true)
  const [terrainElevations, setTerrainElevations] =
    useState<Map<string, number> | null>(null)
  const { favs, toggleFav } = useFavorites(`adventure-${params.id}`)

  const handleSelect = (id: string) => {
    setSelectedId(id)
    setFocusSignal((n) => n + 1)
  }

  // 탭 타이틀 — 모험명 반영
  useEffect(() => {
    if (session?.title) {
      document.title = `${session.title} 관제 · 힐리힐리 LIVE`
    }
  }, [session?.title])

  const categories = useMemo(
    () =>
      Array.from(
        new Set(ranked.map((r) => r.entry.category).filter(Boolean)),
      ) as string[],
    [ranked],
  )
  const visible = useMemo(
    () => filterDisplayEntries(ranked, displayMode, favs, categories),
    [ranked, displayMode, favs, categories],
  )

  if (isAdmin === null || loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-muted-foreground">
        불러오는 중…
      </main>
    )
  }
  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-16 text-center">
        <h1 className="text-lg font-bold">접근 권한이 없어요</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          관제 화면은 관리자만 사용할 수 있어요.
        </p>
      </main>
    )
  }
  if (notFound || !session) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-16 text-center">
        <h1 className="text-lg font-bold">모험을 찾을 수 없어요</h1>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/control">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            관제 목록
          </Link>
        </Button>
      </main>
    )
  }

  // 코스가 있으면 레이스처럼 진행/순위 표시, 없으면 위치만
  const eventType: "race" | "monitor" = courseIndex ? "race" : "monitor"
  const hasProfileView = courseIndex != null
  const showMap = viewMode === "map" || !hasProfileView

  return (
    <main className="px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link href="/control">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold">
              {session.title}
              <Badge variant="secondary">
                {session.is_solo ? "솔로 모험" : "그룹 모험"}
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground">
              {session.mountain_name}
              {course?.name && ` · ${course.name}`}
              {session.started_at && (
                <>
                  {" · 경과 "}
                  <ElapsedClock startsAt={session.started_at} />
                </>
              )}
              {` · ${ranked.length}명`}
            </p>
          </div>
        </div>
      </div>

      <div className="theme-light relative h-[calc(100dvh-180px)] min-h-[480px] overflow-hidden rounded-xl border bg-background text-foreground">
        {/* 상단 중앙 — 뷰 전환만 */}
        {hasProfileView && (
          <div className="absolute left-1/2 top-3 z-30 -translate-x-1/2">
            <ViewModeSwitch mode={viewMode} onChange={setViewMode} />
          </div>
        )}

        {/* 지도 모드 (숨겨도 언마운트하지 않음 — Mapbox 재과금 방지) */}
        <div className={showMap ? "absolute inset-0" : "hidden"}>
          <LiveMap
            bare
            course={course}
            entries={visible}
            tails={[]}
            categories={categories}
            selectedId={selectedId}
            onSelect={handleSelect}
            focusSignal={focusSignal}
            enable3d={is3d}
            onElevations={setTerrainElevations}
            height="100%"
            className="absolute inset-0"
          />
          {/* 2D/3D — 우측 아래 */}
          <MapDimensionToggle
            is3d={is3d}
            onChange={setIs3d}
            className="absolute bottom-3 left-3 z-30"
          />
          <LiveSidebar
            ranked={ranked}
            eventType={eventType}
            isAdmin
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

        {/* 고도 모드: 스크롤 — 프로필 + 순위 리스트 */}
        {!showMap && hasProfileView && courseIndex && (
          <div className="h-full overflow-y-auto px-4 pb-8 pt-14">
            <div className="overflow-hidden rounded-2xl bg-background">
              <ElevationProfile
                index={courseIndex}
                entries={visible}
                categories={categories}
                checkpoints={course?.checkpoints}
                selectedId={selectedId}
                onSelect={handleSelect}
                expanded
                className="h-[42dvh] min-h-[300px]"
              />
            </div>
            <div className="mt-5">
              <LiveTableWide
                ranked={ranked}
                eventType={eventType}
                isAdmin
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
      </div>
    </main>
  )
}
