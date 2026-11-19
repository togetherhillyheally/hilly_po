"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { Share2 } from "lucide-react"
import { toast } from "sonner"
import { shareLink } from "@/lib/share-link"
import {
  type DisplayMode,
  type ViewMode,
  MapDimensionToggle,
  ViewModeSwitch,
  filterDisplayEntries,
} from "@/components/control/DisplayFilter"
import ElevationDrawer from "@/components/control/ElevationDrawer"
import CourseSelect, { useCourseChoice } from "@/components/control/CourseSelect"
import ElevationProfile from "@/components/control/ElevationProfile"
import LiveMap from "@/components/control/LiveMap"
import LiveSidebar, {
  type SheetSnap,
  aboveSheetClass,
  atSheetTopClass,
  mapCtrlBottomStyle,
} from "@/components/control/LiveSidebar"
import LiveTableWide from "@/components/control/LiveTableWide"
import RaceFinishBanner from "@/components/control/RaceFinishBanner"
import AdCard from "@/components/broadcast/AdCard"
import BroadcastPanel from "@/components/broadcast/BroadcastPanel"
import SponsorPanel from "@/components/broadcast/SponsorPanel"
import { useBroadcast } from "@/hooks/use-broadcast"
import { useBroadcastAds } from "@/hooks/use-broadcast-ads"
import { useFavorites } from "@/hooks/use-favorites"
import { useSuperAdmin } from "@/hooks/use-super-admin"
import { useLiveEvent } from "@/hooks/use-live-event"
import { trackerControlRepo } from "@/lib/repos/trackerControlRepo"
import { isPublicToken } from "@/lib/watch-token"

/** 경과 시계 — 1초마다 갱신. 출발 전엔 "출발까지" 카운트다운으로 */
function ElapsedClock({
  startsAt,
  stacked = false,
}: {
  startsAt: string
  /** 라벨을 작게 위에, 시각은 크게 — 모바일 시트 헤더용 */
  stacked?: boolean
}) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 1000)
    return () => clearInterval(t)
  }, [])
  const diff = Math.floor((Date.now() - new Date(startsAt).getTime()) / 1000)
  const pre = diff < 0
  const sec = Math.abs(diff)
  const pad = (n: number) => String(n).padStart(2, "0")
  const hms = `${pad(Math.floor(sec / 3600))}:${pad(Math.floor((sec % 3600) / 60))}:${pad(sec % 60)}`
  if (stacked) {
    return (
      <span className="flex flex-col items-end leading-none">
        <span className="text-[10px] font-semibold text-muted-foreground">
          {pre ? "출발까지" : "경과"}
        </span>
        <span className="mt-1 text-lg font-bold tabular-nums text-foreground">
          {hms}
        </span>
      </span>
    )
  }
  return (
    <span className={pre ? "font-semibold text-foreground/80" : undefined}>
      {pre ? "출발까지 " : "경과 "}
      <span className="tabular-nums">
        {pad(Math.floor(sec / 3600))}:{pad(Math.floor((sec % 3600) / 60))}:
        {pad(sec % 60)}
      </span>
    </span>
  )
}

/** 공개 관전 페이지 — 로그인 없이 접근 (middleware matcher 에서 제외됨).
 *  뷰 모드: 지도(풀스크린 지도 + 우측 사이드바) / 고도(UTMB 식 스크롤 페이지 — 프로필 + 순위 리스트).
 *  지도는 모드 전환 시에도 언마운트하지 않는다 (Mapbox map load 재과금 방지). */
/** /watch/<토큰 또는 짧은 주소> — 짧은 주소(utnp-9peak)면 토큰으로 바꾼 뒤 관전 화면을 그린다 */
export default function WatchPage() {
  const params = useParams<{ token: string }>()
  const key = decodeURIComponent(params.token)
  const [token, setToken] = useState<string | null | undefined>(
    isPublicToken(key) ? key : undefined,
  )
  useEffect(() => {
    if (isPublicToken(key)) {
      setToken(key)
      return
    }
    let cancelled = false
    trackerControlRepo
      .tokenBySlug(key)
      .then((t) => !cancelled && setToken(t))
      .catch(() => !cancelled && setToken(null))
    return () => {
      cancelled = true
    }
  }, [key])

  if (token === undefined) {
    return (
      <main className="theme-light flex min-h-[100dvh] items-center justify-center bg-background text-sm text-muted-foreground">
        불러오는 중…
      </main>
    )
  }
  if (token === null) {
    return (
      <main className="theme-light flex min-h-[100dvh] flex-col items-center justify-center bg-background px-6 text-center text-foreground">
        <h1 className="text-lg font-bold">종료되었거나 없는 이벤트예요</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          링크를 다시 확인해 주세요.
        </p>
      </main>
    )
  }
  return <WatchView token={token} />
}

function WatchView({ token }: { token: string }) {
  const { info, courseIndex, ranked, tails, notFound, loading, lastPolledAt } = useLiveEvent({
    token,
    mode: "public",
  })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focusSignal, setFocusSignal] = useState(0)
  const [displayMode, setDisplayMode] = useState<DisplayMode>("all")
  const [viewMode, setViewMode] = useState<ViewMode>("map")
  const [is3d, setIs3d] = useState(false) // 기본 2D — 3D 는 버튼으로
  const [sheet, setSheet] = useState<SheetSnap>("peek")
  const panelOpen = sheet !== "closed"
  const [elevOpen, setElevOpen] = useState(false)
  const [terrainElevations, setTerrainElevations] =
    useState<Map<string, number> | null>(null)
  const { favs, toggleFav } = useFavorites(token)
  // 라이브 중계(관전 채팅) — 관리자가 켠 이벤트만 방송이 있다. 없으면 탭도 없다
  const { broadcast } = useBroadcast(info ? { kind: "tracker_event", refId: info.id } : null)
  const { isAdmin } = useSuperAdmin()
  // 광고 — 방송이 없어도 전체 광고는 나온다 (시트 머리 아래 / 종료 배너 아래)
  const ads = useBroadcastAds(broadcast?.id ?? null, "tracker_event")
  const broadcastTabs = broadcast
    ? [
        {
          key: "chat",
          label: "채팅",
          badge: broadcast.message_count || null,
          node: <BroadcastPanel broadcast={broadcast} isHost={isAdmin === true} />,
        },
        ...(broadcast.sponsor_enabled
          ? [
              {
                key: "sponsor",
                label: "후원",
                badge: broadcast.sponsor_count || null,
                node: <SponsorPanel broadcast={broadcast} isHost={isAdmin === true} />,
              },
            ]
          : []),
      ]
    : undefined

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
  // 고도표 — 대회가 아니어도(모니터링·빠른 관제) 코스가 있으면 보여준다
  // 지도 선택 — 추가 코스가 있으면 골라 본다 (고도표·거리도 선택한 코스 기준)
  const { courses, activeIdx, setActiveIdx, activeCourse, isMain, profileIndex } =
    useCourseChoice(info, courseIndex)
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
  // 준비중(draft)도 공개 — 진행중과 같이 카운트다운·경과 시계를 보여준다
  const isOpen = info.status === "live" || info.status === "draft"
  // 출발 전 — 신호 없음을 빨간 경고 대신 "출발 대기"로 보여준다 (기기는 출발 직전에 켠다)
  const preStart =
    isOpen &&
    info.starts_at != null &&
    new Date(info.starts_at).getTime() > Date.now()
  const hasProfileView = isRace && courseIndex != null
  const showMap = viewMode === "map" || !hasProfileView
  const hasTopBar = hasProfileView || courses.length > 1
  // 상단 핀 — 데스크톱은 지도 영역(사이드바 360px 제외) 가운데. 화면 전체 가운데로 두면 태블릿에서 사이드바 필터를 덮는다
  const topBarPos =
    "left-3 md:-translate-x-1/2 " +
    (panelOpen ? "md:left-[calc(50%-180px)]" : "md:left-1/2")

  // 관전 링크 공유 — 폰은 시스템 공유 시트(카카오톡 등), PC 는 복사
  async function onShare() {
    const r = await shareLink(window.location.href, `${info!.title} · 힐리힐리 LIVE`)
    if (r === "copied") toast.success("관전 링크를 복사했어요.")
    else if (r === "failed") toast.error("공유하지 못했어요.")
  }
  const shareButton = (
    <button
      type="button"
      onClick={onShare}
      aria-label="관전 링크 공유"
      title="관전 링크 공유"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background/70 text-foreground transition-colors hover:bg-background active:scale-95"
    >
      <Share2 className="h-4 w-4" />
    </button>
  )

  // 이벤트 정보 — 데스크톱은 지도 좌상단, 모바일은 하단 시트 맨 위 (시트를 접으면 지도 위로)
  const eventInfo = (
    <>
      <div className="flex items-start justify-between gap-3">
        <h1 className="truncate text-sm font-bold leading-tight md:text-base">
          {info.title}
        </h1>
        {shareButton}
      </div>
      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground md:text-xs">
        <span className="hidden md:inline">{isRace ? "대회" : "실시간 위치"}</span>
        {activeCourse?.name && <span>{activeCourse.name}</span>}
        {profileIndex && (
          <span className="tabular-nums">
            {(profileIndex.totalM / 1000).toFixed(1)}km
          </span>
        )}
        {profileIndex?.totalAscentM != null && (
          <span className="tabular-nums">D+{profileIndex.totalAscentM}m</span>
        )}
        <span>{ranked.length}명</span>
        {isOpen && info.starts_at && (
          <span>
            <ElapsedClock startsAt={info.starts_at} />
          </span>
        )}
        {info.status === "finished" && <span>종료된 이벤트</span>}
      </p>
    </>
  )

  // 모바일 시트 헤더 — 인원·경과 시간을 오른쪽에 크게 (+ 그 아래 광고 1장)
  const sheetInfo = (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="truncate text-sm font-bold leading-tight">
          {info.title}
        </h1>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
          {activeCourse?.name && (
            <span className="truncate">{activeCourse.name}</span>
          )}
          {profileIndex && (
            <span className="tabular-nums">
              {(profileIndex.totalM / 1000).toFixed(1)}km
            </span>
          )}
          {profileIndex?.totalAscentM != null && (
            <span className="tabular-nums">D+{profileIndex.totalAscentM}m</span>
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-end gap-3">
        <span className="flex flex-col items-end leading-none">
          <span className="text-[10px] font-semibold text-muted-foreground">
            인원
          </span>
          <span className="mt-1 text-lg font-bold tabular-nums">
            {ranked.length}
            <span className="ml-0.5 text-xs font-semibold">명</span>
          </span>
        </span>
        {isOpen && info.starts_at && (
          <ElapsedClock startsAt={info.starts_at} stacked />
        )}
        {info.status === "finished" && (
          <span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold">
            종료
          </span>
        )}
        {shareButton}
      </div>
      </div>
      {ads.ads.sheet_header && (
        <AdCard ad={ads.ads.sheet_header} variant="banner" onImpression={ads.impression} onClick={ads.click} />
      )}
    </div>
  )

  // 지도/고도 전환 + 코스 선택 — 데스크톱은 지도 위, 모바일 지도 모드는 시트 안(공간 절약), 고도 모드는 위에
  const topTools = hasTopBar ? (
    <>
      {hasProfileView && <ViewModeSwitch mode={viewMode} onChange={setViewMode} />}
      {courses.length > 1 && (
        <CourseSelect courses={courses} value={activeIdx} onChange={setActiveIdx} />
      )}
    </>
  ) : null

  return (
    <main className="theme-light relative min-h-[100dvh] w-full bg-background text-foreground">
      {/* 상단 컨트롤 — 지도/고도 전환 + 지도 선택(고도 오른쪽).
          모바일은 좌상단(우상단 줌 버튼과 겹치지 않게), 데스크톱은 상단 중앙 */}
      {hasTopBar && (
        <div
          className={
            "fixed top-3 z-30 items-center gap-2 md:top-4 " +
            (showMap ? "hidden md:flex " : "flex ") +
            topBarPos
          }
        >
          {topTools}
        </div>
      )}

      {/* 레이스 종료 배너 — 지도 위쪽 가운데(컨트롤 아래) */}
      {isRace && info.status === "finished" && (
        <div
          className={
            // 모바일: 핀 아래(카드는 시트 안). 데스크톱: 핀 → 이벤트 카드 → 배너 순으로 쌓기
            "fixed top-[4.75rem] z-20 " +
            (hasTopBar ? "md:top-[9.5rem] " : "md:top-[6.5rem] ") +
            topBarPos
          }
        >
          <div className="flex flex-col items-center gap-2">
            <RaceFinishBanner ranked={ranked} />
            {ads.ads.finish_banner && (
              <AdCard
                ad={ads.ads.finish_banner}
                variant="wide"
                onImpression={ads.impression}
                onClick={ads.click}
                className="w-[min(92vw,420px)] shadow-xl"
              />
            )}
          </div>
        </div>
      )}

      {/* ── 지도 모드 (숨겨도 언마운트하지 않음) ── */}
      <div
        className={showMap ? "absolute inset-0 overflow-hidden" : "hidden"}
        style={mapCtrlBottomStyle(sheet)}
      >
        <LiveMap
          bare
          course={activeCourse}
          enableGeolocate
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

        {/* 좌상단 이벤트 정보 오버레이 — 모바일은 시트 안에 있으므로 시트를 접었을 때만 */}
        <header
          className={
            // 데스크톱도 상단 핀이 있으면 그 아래로 — 핀을 지도 영역 가운데로 옮기니 태블릿에선 카드와 겹친다
            "absolute left-3 z-10 max-w-[calc(100%-4.5rem)] rounded-xl border bg-background/85 px-3 py-2 shadow-lg backdrop-blur md:left-4 md:block md:max-w-none md:px-4 md:py-3 " +
            // 모바일 지도 모드는 핀이 시트 안에 있으니 카드가 맨 위
            (hasTopBar ? "top-3 md:top-16 " : "top-3 md:top-4 ") +
            (panelOpen ? "hidden" : "")
          }
        >
          <p className="hidden text-[10px] font-bold tracking-tight text-muted-foreground md:block">
            HILLY HEALLY LIVE
          </p>
          {eventInfo}
        </header>

        {/* 2D/3D — 좌측 아래 (모바일 하단 시트가 열려 있으면 시트 위로) */}
        {/* 좌측 아래 도구 줄 — 2D/3D, 모바일은 지도/고도 전환·코스 선택도 여기(시트 위, 시트 따라 이동) */}
        <div
          className={
            "absolute left-4 z-30 flex max-w-[calc(100%-4.5rem)] flex-wrap items-center gap-2 md:bottom-4 " +
            // 모바일: 고도표가 펼쳐져 있으면 자리 양보 (데스크톱은 겹치지 않음)
            (elevOpen ? "max-md:hidden " : "") +
            aboveSheetClass(sheet)
          }
        >
          <MapDimensionToggle is3d={is3d} onChange={setIs3d} />
          {topTools && (
            <div className="flex items-center gap-2 md:hidden">{topTools}</div>
          )}
        </div>

        {/* 고도표 — 지도 아래에서 펼쳐 보기 (데스크톱은 사이드바 왼쪽, 모바일은 하단 시트 위)
            대회(고도 뷰 있음)의 모바일에선 상단 지도/고도 전환이 대신하므로 숨김 */}
        {profileIndex && (
          <ElevationDrawer
            index={profileIndex}
            // 다른 코스를 보는 중엔 참가자 점 숨김 — 진행 거리는 대표 코스 기준이라 위치가 맞지 않음
            entries={isMain ? visible : []}
            categories={categories}
            checkpoints={activeCourse?.checkpoints}
            selectedId={selectedId}
            onSelect={handleSelect}
            onOpenChange={setElevOpen}
            className={
              // 모바일: 펼치면 전폭으로 하단 시트 윗변에 붙어 시트의 연장처럼 보이게
              "absolute z-20 md:left-20 md:right-[376px] md:bottom-4 " +
              (hasProfileView ? "hidden md:block " : "") +
              (elevOpen
                ? "left-0 right-0 " + atSheetTopClass(sheet)
                : "left-20 right-4 " + aboveSheetClass(sheet))
            }
          />
        )}

        <LiveSidebar
          ranked={ranked}
          eventType={info.event_type}
          isAdmin={false}
          preStart={preStart}
          loading={lastPolledAt == null}
          categories={categories}
          selectedId={selectedId}
          onSelect={handleSelect}
          favs={favs}
          onToggleFav={toggleFav}
          terrainElevations={terrainElevations}
          displayMode={displayMode}
          onDisplayModeChange={setDisplayMode}
          onSnapChange={setSheet}
          mobileHeader={sheetInfo}
          tabs={broadcastTabs}
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
              {activeCourse?.name && <span>{activeCourse.name}</span>}
              <span>{ranked.length}명</span>
              {isOpen && info.starts_at && (
                <span>
                  <ElapsedClock startsAt={info.starts_at} />
                </span>
              )}
            </p>
          </header>

          <div className="overflow-hidden rounded-2xl bg-background">
            <ElevationProfile
              index={profileIndex ?? courseIndex}
              entries={isMain ? visible : []}
              categories={categories}
              checkpoints={activeCourse?.checkpoints}
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
              preStart={preStart}
              loading={lastPolledAt == null}
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
