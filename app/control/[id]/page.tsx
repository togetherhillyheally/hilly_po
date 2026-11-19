"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Link2,
  Pencil,
  Settings,
  Users,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  type DisplayMode,
  type ViewMode,
  MapDimensionToggle,
  ViewModeSwitch,
  filterDisplayEntries,
} from "@/components/control/DisplayFilter"
import ElevationDrawer from "@/components/control/ElevationDrawer"
import CourseSelect, { useCourseChoice } from "@/components/control/CourseSelect"
import ExtraCoursesCard from "@/components/control/ExtraCoursesCard"
import WatchLinkCard from "@/components/control/WatchLinkCard"
import ElevationProfile from "@/components/control/ElevationProfile"
import EntryManager from "@/components/control/EntryManager"
import EventFormDialog from "@/components/control/EventFormDialog"
import LiveMap from "@/components/control/LiveMap"
import LiveSidebar, {
  type SheetSnap,
  aboveSheetClass,
  atSheetTopClass,
  mapCtrlBottomStyle,
} from "@/components/control/LiveSidebar"
import LiveTableWide from "@/components/control/LiveTableWide"
import RaceFinishBanner from "@/components/control/RaceFinishBanner"
import SignalLostAlert, {
  signalLostEntries,
} from "@/components/control/SignalLostAlert"
import BroadcastPanel from "@/components/broadcast/BroadcastPanel"
import HostConsole from "@/components/broadcast/HostConsole"
import SponsorPanel from "@/components/broadcast/SponsorPanel"
import { useBroadcast } from "@/hooks/use-broadcast"
import { useEventSos } from "@/hooks/use-event-sos"
import { broadcastRepo } from "@/lib/repos/broadcastRepo"
import { shareLink } from "@/lib/share-link"
import { useFavorites } from "@/hooks/use-favorites"
import { useLiveEvent } from "@/hooks/use-live-event"
import { useSuperAdmin } from "@/hooks/use-super-admin"
import { trackerControlRepo } from "@/lib/repos/trackerControlRepo"
import type {
  TrackerEvent,
  TrackerEventStatus,
} from "@/lib/repos/trackerControlTypes"

const STATUS_FLOW: { value: TrackerEventStatus; label: string }[] = [
  { value: "draft", label: "준비중" },
  { value: "live", label: "진행중" },
  { value: "finished", label: "종료" },
  { value: "archived", label: "보관" },
]

export default function ControlRoomPage() {
  const params = useParams<{ id: string }>()
  const eventId = params.id
  const { isAdmin } = useSuperAdmin()
  const [event, setEvent] = useState<TrackerEvent | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  const reloadEvent = useCallback(async () => {
    try {
      const list = await trackerControlRepo.listEvents()
      const found = list.find((e) => e.id === eventId) ?? null
      setEvent(found)
      if (!found) setLoadFailed(true)
    } catch {
      toast.error("이벤트를 불러오지 못했어요.")
      setLoadFailed(true)
    }
  }, [eventId])

  useEffect(() => {
    if (isAdmin) reloadEvent()
  }, [isAdmin, reloadEvent])

  // 게스트는 관리용 화면 대신 같은 이벤트의 공개 관전 화면으로 보낸다
  const router = useRouter()
  const [guestMissing, setGuestMissing] = useState(false)
  useEffect(() => {
    if (isAdmin !== false) return
    trackerControlRepo
      .listPublicEvents()
      .then((list) => {
        const ev = list.find((e) => e.id === params.id)
        if (ev) router.replace(`/watch/${ev.public_token}`)
        else setGuestMissing(true)
      })
      .catch(() => setGuestMissing(true))
  }, [isAdmin, params.id, router])

  if (isAdmin === null) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-muted-foreground">
        확인 중…
      </main>
    )
  }
  if (!isAdmin) {
    return guestMissing ? (
      <main className="mx-auto max-w-7xl px-4 py-16 text-center">
        <h1 className="text-lg font-bold">지금 볼 수 있는 이벤트가 아니에요</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          진행 중이거나 끝난 이벤트만 공개돼요.
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/control">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            관제 목록
          </Link>
        </Button>
      </main>
    ) : (
      <main className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-muted-foreground">
        불러오는 중…
      </main>
    )
  }
  if (loadFailed && !event) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-16 text-center">
        <h1 className="text-lg font-bold">이벤트를 찾을 수 없어요</h1>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/control">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            이벤트 목록
          </Link>
        </Button>
      </main>
    )
  }
  if (!event) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-muted-foreground">
        불러오는 중…
      </main>
    )
  }

  return <ControlRoom event={event} onEventChanged={reloadEvent} />
}

function ControlRoom({
  event,
  onEventChanged,
}: {
  event: TrackerEvent
  onEventChanged: () => void
}) {
  const { info, courseIndex, ranked, tails, lastPolledAt, reloadInfo } = useLiveEvent({
    token: event.public_token,
    mode: "admin",
  })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focusSignal, setFocusSignal] = useState(0)
  const [editOpen, setEditOpen] = useState(false)
  const [displayMode, setDisplayMode] = useState<DisplayMode>("all")
  const [viewMode, setViewMode] = useState<ViewMode>("map")
  const [is3d, setIs3d] = useState(false) // 기본 2D — 3D 는 버튼으로
  const [sheet, setSheet] = useState<SheetSnap>("peek")
  const [elevOpen, setElevOpen] = useState(false)
  // 모바일 ⋯ 메뉴에서 참가자·설정 탭으로 보내기 위해 탭을 직접 관리
  const [tab, setTab] = useState("live")
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [terrainElevations, setTerrainElevations] =
    useState<Map<string, number> | null>(null)
  const { favs, toggleFav } = useFavorites(event.id)

  // 라이브 중계(관전 채팅) — 설정 탭에서 켜면 관전 페이지와 여기 사이드바에 채팅 탭이 생긴다
  const { broadcast, apply: applyBroadcast } = useBroadcast({ kind: "tracker_event", refId: event.id })
  const [enablingBroadcast, setEnablingBroadcast] = useState(false)
  async function enableBroadcast() {
    setEnablingBroadcast(true)
    try {
      applyBroadcast(await broadcastRepo.adminEnsureForEvent(event.id))
      toast.success("관전 채팅을 켰어요. 관전 페이지에 채팅 탭이 보여요.")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "중계를 켜지 못했어요.")
    } finally {
      setEnablingBroadcast(false)
    }
  }
  const broadcastTabs = broadcast
    ? [
        {
          key: "chat",
          label: "채팅",
          badge: broadcast.message_count || null,
          node: <BroadcastPanel broadcast={broadcast} isHost />,
        },
        ...(broadcast.sponsor_enabled
          ? [
              {
                key: "sponsor",
                label: "후원",
                badge: broadcast.sponsor_count || null,
                node: <SponsorPanel broadcast={broadcast} isHost />,
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
  const [, setTick] = useState(0)

  // "마지막 갱신 n초 전" 표시 갱신용
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 5_000)
    return () => clearInterval(t)
  }, [])

  // 탭 타이틀 — 이벤트명 반영
  useEffect(() => {
    document.title = `${event.title} 관제 · 힐리힐리 LIVE`
  }, [event.title])

  const categories = useMemo(
    () =>
      Array.from(
        new Set(ranked.map((r) => r.entry.category).filter(Boolean)),
      ) as string[],
    [ranked],
  )

  // 지도/프로필/꼬리에만 적용되는 표시 필터 (사이드바 목록은 전체 유지)
  // 고도표 — 대회가 아니어도(모니터링·빠른 관제) 코스가 있으면 보여준다
  // 지도 선택 — 설정의 추가 지도가 있으면 골라 본다
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

  // 앱에서 보낸 SOS — 이 코스로 진행한 모험의 것만 (이벤트 시작 6시간 전부터)
  const sosSince = event.starts_at
    ? new Date(new Date(event.starts_at).getTime() - 6 * 3600_000).toISOString()
    : null
  const appSos = useEventSos(event.trail_id, sosSince)
  const [sosFocus, setSosFocus] = useState<{ id: string; n: number } | null>(null)
  const sosPoints = useMemo(
    () =>
      appSos.open
        .filter((a) => a.lat != null && a.lng != null)
        .map((a) => ({ id: a.id, lat: a.lat!, lng: a.lng!, label: a.nickname ?? "참가자" })),
    [appSos.open],
  )
  async function resolveSos(id: string) {
    if (!window.confirm("이 SOS 를 처리 완료로 표시할까요? 지도에서 사라져요.")) return
    try {
      await appSos.resolve(id)
      toast.success("SOS 를 처리 완료로 표시했어요.")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "처리하지 못했어요.")
    }
  }

  const sosCount = ranked.filter((r) => r.status === "sos").length + appSos.open.length
  const hasProfileView = event.event_type === "race" && courseIndex != null
  const showMap = viewMode === "map" || !hasProfileView
  const hasTopBar = hasProfileView || courses.length > 1
  // 상단 핀 — 데스크톱은 지도 영역(사이드바 360px 제외) 가운데, 모바일은 왼쪽 위
  const topBarPos =
    "left-3 md:-translate-x-1/2 " +
    (sheet !== "closed" ? "md:left-[calc(50%-180px)]" : "md:left-1/2")
  const lost = event.status === "live" ? signalLostEntries(ranked) : []

  // 앱 SOS 카드 — 누르면 위치로 이동, 처리 완료로 제거 (데스크톱 좌상단·모바일 경고 띠 공용)
  const sosCards = appSos.open.map((a) => (
    <div
      key={a.id}
      className="rounded-xl border border-red-500 bg-red-600 p-3 text-white shadow-lg"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-extrabold">SOS · {a.nickname ?? "참가자"}</span>
        <span className="text-xs opacity-90">
          {new Date(a.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
      {a.sessionTitle && <p className="mt-0.5 truncate text-xs opacity-90">{a.sessionTitle}</p>}
      {a.note && <p className="mt-1 text-xs">{a.note}</p>}
      <p className="mt-1 font-mono text-[11px] opacity-90">
        {a.lat != null && a.lng != null ? `${a.lat.toFixed(5)}, ${a.lng.toFixed(5)}` : "위치 없음"}
      </p>
      <div className="mt-2 flex gap-2">
        {a.lat != null && a.lng != null && (
          <button
            type="button"
            className="flex-1 rounded-md bg-white/20 px-2 py-1.5 text-xs font-bold hover:bg-white/30"
            onClick={() => {
              setAlertsOpen(false)
              setSosFocus((f) => ({ id: a.id, n: (f?.n ?? 0) + 1 }))
            }}
          >
            위치 보기
          </button>
        )}
        <button
          type="button"
          className="flex-1 rounded-md bg-white px-2 py-1.5 text-xs font-bold text-red-700 hover:bg-white/90"
          onClick={() => void resolveSos(a.id)}
        >
          처리 완료
        </button>
      </div>
    </div>
  ))

  // 관전 짧은 주소 — 있으면 복사·표시에 우선 사용
  const [slug, setSlug] = useState<string | null>(null)
  useEffect(() => {
    trackerControlRepo.getSlug(event.id).then(setSlug).catch(() => {})
  }, [event.id])

  // 관전 링크 — 폰은 시스템 공유 시트(카카오톡 등), PC 는 복사
  async function copyWatchLink() {
    const url = `${window.location.origin}/watch/${slug ?? event.public_token}`
    const r = await shareLink(url, `${event.title} · 힐리힐리 LIVE`)
    if (r === "copied") toast.success("관전 링크를 복사했어요.")
    else if (r === "failed") toast.error("공유하지 못했어요.")
  }

  async function setStatus(status: TrackerEventStatus) {
    try {
      await trackerControlRepo.upsertEvent({
        id: event.id,
        title: event.title,
        event_type: event.event_type,
        trail_id: event.trail_id,
        starts_at: event.starts_at,
        ends_at: event.ends_at,
        status,
      })
      // 종료 시 현재 순위·기록을 결과로 확정 저장 (기록 아카이브·업적의 기반)
      if (status === "finished" && event.event_type === "race") {
        try {
          const count = await trackerControlRepo.finalizeEvent(
            event.id,
            ranked.map((r) => ({
              entry_id: r.entry.entry_id,
              rank: r.rank,
              category_rank: r.categoryRank,
              status: r.finished ? ("finished" as const) : ("dnf" as const),
              finished_at: r.finished ? r.entry.recorded_at : null,
              distance_km:
                r.progressM != null ? +(r.progressM / 1000).toFixed(2) : null,
              ascent_m: r.ascentM != null ? Math.round(r.ascentM) : null,
            })),
          )
          toast.success(`결과 ${count}건을 확정했어요.`)
        } catch {
          toast.error("결과 확정에 실패했어요. 상태는 종료로 변경됐어요.")
        }
      } else {
        toast.success("상태를 변경했어요.")
      }
      onEventChanged()
    } catch {
      toast.error("상태 변경에 실패했어요.")
    }
  }

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
    <main className="px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link href="/control">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">{event.title}</h1>
            <p className="text-xs text-muted-foreground">
              {event.event_type === "race" ? "대회" : "모니터링"}
              {event.trail_name && ` · ${event.trail_name}`}
              {lastPolledAt &&
                ` · 마지막 갱신 ${Math.max(0, Math.round((Date.now() - lastPolledAt) / 1000))}초 전`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {sosCount > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              SOS {sosCount}건
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={copyWatchLink}>
            <Link2 className="mr-1.5 h-4 w-4" />
            관전 링크
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="live">관제</TabsTrigger>
          <TabsTrigger value="entries">참가자</TabsTrigger>
          <TabsTrigger value="settings">설정</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="mt-0 md:mt-4">
          {/* 모바일: 사이트 헤더·제목·탭 위를 덮는 전체 화면(슬림 바 + 지도) — 폰에선 지도가 화면의 절반도 안 남았다.
              데스크톱: 지금처럼 페이지 안의 상자 */}
          <div className="fixed inset-0 z-50 flex flex-col bg-background md:static md:z-auto md:block">
          <div className="theme-light relative min-h-0 flex-1 overflow-hidden bg-background text-foreground md:h-[calc(100dvh-220px)] md:min-h-[480px] md:flex-none md:rounded-xl md:border">
            {/* 모바일 상단 — 바 없이 지도 위에 ← 와 제목 칩만 (앱과 같은 투명 배경). 칩을 누르면 메뉴 */}
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex h-9 min-w-0 items-center gap-1.5 rounded-full px-2 text-base font-extrabold transition-transform active:scale-95 active:bg-background/60 [text-shadow:0_1px_3px_rgba(255,255,255,0.95),0_0_8px_rgba(255,255,255,0.8)]"
                  >
                    {/* 초록 점 = 위치가 들어오고 있음 */}
                    <span
                      className={
                        "h-1.5 w-1.5 shrink-0 rounded-full " +
                        (lastPolledAt ? "bg-emerald-500" : "bg-muted-foreground/40")
                      }
                    />
                    <span className="truncate">{event.title}</span>
                    {sosCount > 0 && (
                      <Badge variant="destructive" className="ml-0.5 shrink-0 animate-pulse px-1.5 py-0 text-[10px]">
                        SOS {sosCount}
                      </Badge>
                    )}
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="theme-light">
                  <DropdownMenuItem onClick={copyWatchLink}>
                    <Link2 className="mr-2 h-4 w-4" />
                    관전 링크 공유
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTab("entries")}>
                    <Users className="mr-2 h-4 w-4" />
                    참가자 관리
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTab("settings")}>
                    <Settings className="mr-2 h-4 w-4" />
                    설정
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {/* 상단 — 지도/고도 전환 + 지도 선택(고도 오른쪽). 모바일은 제목 칩 아래 줄 */}
            {hasTopBar && (
              <div
                className={
                  "absolute top-[3.75rem] z-30 items-center gap-2 md:top-3 " +
                  (showMap ? "hidden md:flex " : "flex ") +
                  topBarPos
                }
              >
                {topTools}
              </div>
            )}

            {/* 레이스 종료 배너 — 지도 위쪽 가운데(컨트롤 아래) */}
            {event.event_type === "race" && event.status === "finished" && (
              <div
                className={
                  "absolute z-20 md:top-14 " +
                  (hasTopBar && !showMap ? "top-[6.5rem] " : "top-[3.75rem] ") +
                  topBarPos
                }
              >
                <RaceFinishBanner ranked={ranked} />
              </div>
            )}

            {/* 지도 모드 (숨겨도 언마운트하지 않음 — Mapbox 재과금 방지) */}
            <div
              className={showMap ? "absolute inset-0" : "hidden"}
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
                sosPoints={sosPoints}
                sosFocus={sosFocus}
              />
              {/* 데스크톱 좌측 위: 앱 SOS 카드 + 장시간 신호 끊김 경고 */}
              <div className="absolute left-3 top-3 z-30 hidden w-72 space-y-2 md:block">
                {sosCards.length > 0 && <div className="space-y-2">{sosCards}</div>}
                {event.status === "live" && (
                  <SignalLostAlert ranked={ranked} onSelect={handleSelect} />
                )}
              </div>
              {/* 모바일: 288px 카드가 지도를 다 가리던 자리 — 한 줄 띠로 요약하고 누르면 펼침.
                  오른쪽은 지도 버튼(내 위치·코스 전체) 자리를 비운다 */}
              {(sosCards.length > 0 || lost.length > 0) && (
                <div
                  className={
                    "absolute left-3 right-3 top-[3.75rem] z-30 md:hidden"
                  }
                >
                  <button
                    type="button"
                    onClick={() => setAlertsOpen((v) => !v)}
                    aria-expanded={alertsOpen}
                    className={
                      "flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-extrabold shadow-lg " +
                      (sosCards.length > 0
                        ? "border-red-500 bg-red-600 text-white"
                        : "border-amber-500 bg-amber-50 text-amber-950")
                    }
                  >
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">
                      {sosCards.length > 0 && `SOS ${sosCards.length}건`}
                      {sosCards.length > 0 && lost.length > 0 && " · "}
                      {lost.length > 0 && `신호 끊김 ${lost.length}명`}
                    </span>
                    {alertsOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  {alertsOpen && (
                    <div className="mt-2 max-h-[40dvh] space-y-2 overflow-y-auto">
                      {sosCards}
                      {lost.length > 0 && (
                        <SignalLostAlert
                          ranked={ranked}
                          onSelect={(id) => {
                            setAlertsOpen(false)
                            handleSelect(id)
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
              {/* 좌측 아래 도구 줄 — 2D/3D, 모바일은 지도/고도 전환·코스 선택도 여기(시트 위, 시트 따라 이동).
                  데스크톱의 전환 핀은 위쪽 */}
              <div
                className={
                  "absolute left-3 z-30 flex max-w-[calc(100%-4.5rem)] flex-wrap items-center gap-2 md:bottom-3 " +
                  (elevOpen ? "max-md:hidden " : "") +
                  aboveSheetClass(sheet)
                }
              >
                <MapDimensionToggle is3d={is3d} onChange={setIs3d} />
                {topTools && (
                  <div className="flex items-center gap-2 md:hidden">{topTools}</div>
                )}
              </div>
              {/* 고도표 — 지도 아래에서 펼쳐 보기 (대회 모바일은 상단 지도/고도 전환이 대신) */}
              {profileIndex && (
                <ElevationDrawer
                  index={profileIndex}
                  entries={isMain ? visible : []}
                  categories={categories}
                  checkpoints={activeCourse?.checkpoints}
                  selectedId={selectedId}
                  onSelect={handleSelect}
                  onOpenChange={setElevOpen}
                  className={
                    "absolute z-20 md:left-20 md:right-[372px] md:bottom-3 " +
                    (hasProfileView ? "hidden md:block " : "") +
                    // 모바일: 펼치면 시트 윗변에 전폭으로 붙음
                    (elevOpen
                      ? "left-0 right-0 " + atSheetTopClass(sheet)
                      : "left-20 right-3 " + aboveSheetClass(sheet))
                  }
                />
              )}
              <LiveSidebar
                loading={lastPolledAt == null}
                ranked={ranked}
                eventType={event.event_type}
                isAdmin
                categories={categories}
                selectedId={selectedId}
                onSelect={handleSelect}
                favs={favs}
                onToggleFav={toggleFav}
                terrainElevations={terrainElevations}
                displayMode={displayMode}
                onDisplayModeChange={setDisplayMode}
                onSnapChange={setSheet}
                tabs={broadcastTabs}
              />
            </div>

            {/* 고도 모드: 스크롤 — 프로필 + 순위 리스트 */}
            {!showMap && hasProfileView && courseIndex && (
              <div
                className={
                  "h-full overflow-y-auto px-4 pb-8 " +
                  // 모바일은 제목 칩 + 전환 핀 두 줄(+종료 배너) 아래부터
                  (event.status === "finished"
                    ? "pt-44 md:pt-32"
                    : "pt-[6.5rem] md:pt-14")
                }
              >
                <div className="overflow-hidden rounded-2xl bg-background">
                  <ElevationProfile
                    index={profileIndex ?? courseIndex}
                    entries={isMain ? visible : []}
                    categories={categories}
                    checkpoints={activeCourse?.checkpoints}
                    selectedId={selectedId}
                    onSelect={handleSelect}
                    expanded
                    className="h-[42dvh] min-h-[300px]"
                  />
                </div>
                <div className="mt-5">
                  <LiveTableWide
                    loading={lastPolledAt == null}
                    ranked={ranked}
                    eventType={event.event_type}
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
          </div>
        </TabsContent>

        <TabsContent value="entries" className="mt-4">
          <EntryManager eventId={event.id} />
        </TabsContent>

        <TabsContent value="settings" className="mt-4 space-y-6">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold">이벤트 상태</h2>
            <p className="text-xs text-muted-foreground">
              준비중·진행중·종료 상태에선 관전 링크가 열려요. 보관하면 링크가
              닫혀요.
            </p>
            <div className="flex gap-2">
              {STATUS_FLOW.map((s) => (
                <Button
                  key={s.value}
                  size="sm"
                  variant={event.status === s.value ? "default" : "outline"}
                  onClick={() => setStatus(s.value)}
                  disabled={event.status === s.value}
                >
                  {s.label}
                </Button>
              ))}
            </div>
          </div>

          {/* 라이브 중계 — 관전 페이지 채팅 (후원·라디오는 다음 단계) */}
          {broadcast ? (
            <HostConsole broadcast={broadcast} onChanged={applyBroadcast} />
          ) : (
            <div className="space-y-2 rounded-xl border p-4">
              <h2 className="text-sm font-semibold">라이브 중계</h2>
              <p className="text-xs text-muted-foreground">
                켜면 관전 페이지에 채팅 탭이 생겨요. 읽기는 누구나, 글쓰기는 힐리힐리 로그인이 필요해요.
                진행자(관리자) 글은 강조되고 위에 고정할 수 있어요.
              </p>
              <Button
                size="sm"
                disabled={enablingBroadcast}
                className="bg-[#DC2F55] text-white hover:bg-[#DC2F55]/90"
                onClick={() => void enableBroadcast()}
              >
                관전 채팅 켜기
              </Button>
            </div>
          )}

          <WatchLinkCard
            eventId={event.id}
            publicToken={event.public_token}
            slug={slug}
            onSlugChange={setSlug}
          />

          <ExtraCoursesCard
            eventId={event.id}
            mainTrailId={event.trail_id}
            onSaved={reloadInfo}
          />

          <div className="space-y-2">
            <h2 className="text-sm font-semibold">이벤트 정보</h2>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-1.5 h-4 w-4" />
              이벤트 수정
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <EventFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        event={event}
        onSaved={onEventChanged}
      />
    </main>
  )
}
