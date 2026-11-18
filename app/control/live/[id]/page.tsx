"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
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
import AdventureScoreboard, {
  teamLabel,
} from "@/components/control/AdventureScoreboard"
import ElevationDrawer from "@/components/control/ElevationDrawer"
import { buildProfileIndex } from "@/lib/course-progress"
import ElevationProfile from "@/components/control/ElevationProfile"
import LiveMap from "@/components/control/LiveMap"
import LiveSidebar, {
  type SheetSnap,
  aboveSheetClass,
  atSheetTopClass,
  mapCtrlBottomStyle,
} from "@/components/control/LiveSidebar"
import LiveTableWide from "@/components/control/LiveTableWide"
import BroadcastPanel from "@/components/broadcast/BroadcastPanel"
import HostConsole from "@/components/broadcast/HostConsole"
import { useBroadcast } from "@/hooks/use-broadcast"
import { useFavorites } from "@/hooks/use-favorites"
import { useLiveAdventure } from "@/hooks/use-live-adventure"
import { useSessionScoreboard } from "@/hooks/use-session-scoreboard"
import type { RankedEntry } from "@/lib/course-progress"
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
  const {
    session,
    course,
    courseIndex,
    ranked: rawRanked,
    notFound,
    loading,
  } = useLiveAdventure(params.id)
  // 배점형 코스 모험이면 팀·조 점수판 (앱과 동일한 계산)
  const board = useSessionScoreboard(params.id, true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focusSignal, setFocusSignal] = useState(0)
  const [displayMode, setDisplayMode] = useState<DisplayMode>("all")
  const [viewMode, setViewMode] = useState<ViewMode>("map")
  const [is3d, setIs3d] = useState(true)
  const [sheet, setSheet] = useState<SheetSnap>("peek")
  const [elevOpen, setElevOpen] = useState(false)
  const [terrainElevations, setTerrainElevations] =
    useState<Map<string, number> | null>(null)
  const { favs, toggleFav } = useFavorites(`adventure-${params.id}`)
  // 이 모험의 공개 중계(앱에서 켬) — 있으면 채팅 탭 + 관리자용 진행자 콘솔
  const { broadcast, apply: applyBroadcast } = useBroadcast({ kind: "hiking_session", refId: params.id })
  const broadcastTabs = broadcast
    ? [
        {
          key: "chat",
          label: "채팅",
          badge: broadcast.message_count || null,
          node: <BroadcastPanel broadcast={broadcast} isHost={isAdmin === true} />,
        },
        ...(isAdmin === true
          ? [
              {
                key: "console",
                label: "중계",
                node: (
                  <div className="overflow-y-auto p-3">
                    <HostConsole broadcast={broadcast} onChanged={applyBroadcast} />
                  </div>
                ),
              },
            ]
          : []),
      ]
    : undefined

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

  // 점수판이 있으면 구분 = 소속 팀(마커·목록 색 통일), 점수 = 사람별 점수
  const ranked = useMemo(() => {
    if (!board) return rawRanked
    const teamOf = new Map<string, number>()
    for (const sq of board.squads)
      for (const uid of sq.member_ids) teamOf.set(uid, sq.team_no ?? 1)
    return rawRanked.map((r) => {
      const team = teamOf.get(r.entry.entry_id)
      return {
        ...r,
        entry: {
          ...r.entry,
          category: team != null ? teamLabel(team) : r.entry.category,
        },
        gameScore: board.points_by_user[r.entry.entry_id] ?? 0,
      }
    })
  }, [rawRanked, board])
  // 지도 마커 글자 = 소속 조 이름 (점수는 점수판에서). 조가 없으면 닉네임
  // 2인 1팀(팀마다 조 하나)이면 점수판과 같은 동물 조 이름으로 — DB 조 이름("1팀")은 그대로 둔다
  const squadNameOf = useMemo(() => {
    const perTeam = new Map<number, number>()
    for (const sq of board?.squads ?? []) {
      const t = sq.team_no ?? 1
      perTeam.set(t, (perTeam.get(t) ?? 0) + 1)
    }
    const m = new Map<string, string>()
    for (const sq of board?.squads ?? []) {
      const t = sq.team_no ?? 1
      const label = (perTeam.get(t) ?? 0) <= 1 ? teamLabel(t) : sq.name
      for (const uid of sq.member_ids) m.set(uid, label)
    }
    return m
  }, [board])
  const markerText = useCallback(
    (r: RankedEntry) =>
      squadNameOf.get(r.entry.entry_id) ?? r.entry.display_name,
    [squadNameOf],
  )

  const liveIds = useMemo(
    () => new Set(rawRanked.map((r) => r.entry.entry_id)),
    [rawRanked],
  )

  const categories = useMemo(
    () =>
      board
        ? [...board.teams]
            .sort((a, b) => a.team_no - b.team_no)
            .map((t) => teamLabel(t.team_no))
        : (Array.from(
            new Set(ranked.map((r) => r.entry.category).filter(Boolean)),
          ) as string[]),
    [ranked, board],
  )
  // 고도표 — 대회가 아니어도(모니터링·빠른 관제) 코스가 있으면 보여준다
  const profileIndex = useMemo(
    () => courseIndex ?? buildProfileIndex(course?.coordinates),
    [courseIndex, course],
  )
  const visible = useMemo(
    () => filterDisplayEntries(ranked, displayMode, favs, categories),
    [ranked, displayMode, favs, categories],
  )

  // 공개 보기 — 로그인하지 않은 게스트도 본다 (관리자 전용 정보만 isAdmin 으로 가림)
  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-muted-foreground">
        불러오는 중…
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
      {/* 데스크톱 헤더 — 모바일은 아래 전체 화면의 슬림 바가 대신 */}
      <div className="mb-4 hidden flex-wrap items-center justify-between gap-3 md:flex">
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

      {/* 모바일: 사이트 헤더·제목 위를 덮는 전체 화면(슬림 바 + 지도). 데스크톱: 페이지 안의 상자 */}
      <div className="fixed inset-0 z-50 flex flex-col bg-background md:static md:z-auto md:block">
      <div className="theme-light relative min-h-0 flex-1 overflow-hidden bg-background text-foreground md:h-[calc(100dvh-180px)] md:min-h-[480px] md:flex-none md:rounded-xl md:border">
        {/* 모바일 상단 — 바 없이 지도 위에 ← 와 제목 칩만 (앱과 같은 투명 배경) */}
        <div className="absolute left-3 top-3 z-30 flex max-w-[calc(100%-6rem)] items-center gap-2 md:hidden">
          {/* 배경 없이 글자만 — 흰 번짐으로 지도 위에서 읽히게, 누르면 살짝 줄어드는 반응 */}
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full transition-transform active:scale-90 active:bg-background/60 [filter:drop-shadow(0_1px_2px_rgba(255,255,255,0.9))]"
          >
            <Link href="/control" aria-label="관제 목록">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <span className="flex h-9 min-w-0 items-center rounded-full px-2 text-base font-extrabold [text-shadow:0_1px_3px_rgba(255,255,255,0.95),0_0_8px_rgba(255,255,255,0.8)]">
            <span className="truncate">{session.title}</span>
          </span>
        </div>
        {/* 상단 — 뷰 전환만. 모바일은 제목 칩 아래 줄, 데스크톱은 지도 영역(사이드바 제외) 가운데 */}
        {hasProfileView && (
          <div
            className={
              "absolute left-1/2 top-[3.75rem] z-30 -translate-x-1/2 md:top-3 " +
              // 모바일 지도 모드는 시트 안(mobileTools)에 있다 — 고도 모드에서만 위에
              (showMap ? "hidden md:block " : "") +
              (sheet !== "closed" ? "md:left-[calc(50%-180px)]" : "")
            }
          >
            <ViewModeSwitch mode={viewMode} onChange={setViewMode} />
          </div>
        )}

        {/* 지도 모드 (숨겨도 언마운트하지 않음 — Mapbox 재과금 방지) */}
        <div
          className={showMap ? "absolute inset-0" : "hidden"}
          style={mapCtrlBottomStyle(sheet)}
        >
          <LiveMap
            bare
            course={course}
            enableGeolocate
            entries={visible}
            tails={[]}
            categories={categories}
            selectedId={selectedId}
            onSelect={handleSelect}
            focusSignal={focusSignal}
            enable3d={is3d}
            markerText={markerText}
            groupRadiusM={50}
            onElevations={setTerrainElevations}
            height="100%"
            className="absolute inset-0"
          />
          {board && (
            <AdventureScoreboard
              board={board}
              categories={categories}
              liveIds={liveIds}
              selectedId={selectedId}
              onSelect={handleSelect}
              className="absolute left-3 top-[3.75rem] z-30 md:top-3"
            />
          )}
          {/* 2D/3D — 좌측 아래 (모바일 하단 시트가 열려 있으면 시트 위로) */}
          {/* 좌측 아래 도구 줄 — 2D/3D, 모바일은 지도/고도 전환도 여기(시트 위, 시트 따라 이동) */}
          <div
            className={
              "absolute left-3 z-30 flex items-center gap-2 md:bottom-3 " +
              // 모바일: 고도표가 펼쳐져 있으면 자리 양보
              (elevOpen ? "max-md:hidden " : "") +
              aboveSheetClass(sheet)
            }
          >
            <MapDimensionToggle is3d={is3d} onChange={setIs3d} />
            {hasProfileView && (
              <div className="md:hidden">
                <ViewModeSwitch mode={viewMode} onChange={setViewMode} />
              </div>
            )}
          </div>
          {/* 고도표 — 지도 아래에서 펼쳐 보기. 모바일은 펼치면 시트 윗변에 전폭으로 붙음 */}
          {profileIndex && (
            <ElevationDrawer
              index={profileIndex}
              entries={visible}
              categories={categories}
              checkpoints={course?.checkpoints}
              selectedId={selectedId}
              onSelect={handleSelect}
              onOpenChange={setElevOpen}
              className={
                "absolute z-20 md:left-20 md:right-[372px] md:bottom-3 " +
                // 모바일은 상단 지도/고도 전환이 고도를 보여주므로 서랍은 숨김 (같은 내용 중복)
                (hasProfileView ? "hidden md:block " : "") +
                (elevOpen
                  ? "left-0 right-0 " + atSheetTopClass(sheet)
                  : "left-20 right-3 " + aboveSheetClass(sheet))
              }
            />
          )}
          <LiveSidebar
            ranked={ranked}
            eventType={eventType}
            isAdmin={isAdmin === true}
            categories={categories}
            selectedId={selectedId}
            onSelect={handleSelect}
            favs={favs}
            onToggleFav={toggleFav}
            terrainElevations={terrainElevations}
            displayMode={displayMode}
            onDisplayModeChange={setDisplayMode}
            onSnapChange={setSheet}
            // 솔로 모험 — 순위·TOP 3·필터·검색 없이 그 사람 정보만
            single={session.is_solo}
            tabs={broadcastTabs}
            mobileHeader={
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold leading-tight">
                    {session.mountain_name}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {[
                      session.is_solo ? "솔로" : `그룹 ${ranked.length}명`,
                      // 코스 이름이 산 이름과 같으면 한 번만
                      course?.name && course.name !== session.mountain_name
                        ? course.name
                        : null,
                      profileIndex && `${(profileIndex.totalM / 1000).toFixed(1)}km`,
                      profileIndex?.totalAscentM != null && `D+${profileIndex.totalAscentM}m`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                {session.started_at && (
                  <span className="flex shrink-0 flex-col items-end leading-none">
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      경과
                    </span>
                    <span className="mt-1 text-lg font-bold">
                      <ElapsedClock startsAt={session.started_at} />
                    </span>
                  </span>
                )}
              </div>
            }
          />
        </div>

        {/* 고도 모드: 스크롤 — 프로필 + 순위 리스트 */}
        {!showMap && hasProfileView && courseIndex && (
          <div className="h-full overflow-y-auto px-4 pb-8 pt-[6.5rem] md:pt-14">
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
                isAdmin={isAdmin === true}
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
      </div>
    </main>
  )
}
