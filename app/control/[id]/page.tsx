"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, Link2, Pencil } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  type DisplayMode,
  type ViewMode,
  MapDimensionToggle,
  ViewModeSwitch,
  filterDisplayEntries,
} from "@/components/control/DisplayFilter"
import ElevationProfile from "@/components/control/ElevationProfile"
import EntryManager from "@/components/control/EntryManager"
import EventFormDialog from "@/components/control/EventFormDialog"
import LiveMap from "@/components/control/LiveMap"
import LiveSidebar from "@/components/control/LiveSidebar"
import LiveTableWide from "@/components/control/LiveTableWide"
import RaceFinishBanner from "@/components/control/RaceFinishBanner"
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

  if (isAdmin === null) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-muted-foreground">
        확인 중…
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
  const { info, courseIndex, ranked, tails, lastPolledAt } = useLiveEvent({
    token: event.public_token,
    mode: "admin",
  })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focusSignal, setFocusSignal] = useState(0)
  const [editOpen, setEditOpen] = useState(false)
  const [displayMode, setDisplayMode] = useState<DisplayMode>("all")
  const [viewMode, setViewMode] = useState<ViewMode>("map")
  const [is3d, setIs3d] = useState(true)
  const [panelOpen, setPanelOpen] = useState(true)
  const [terrainElevations, setTerrainElevations] =
    useState<Map<string, number> | null>(null)
  const { favs, toggleFav } = useFavorites(event.id)

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
  const visible = useMemo(
    () => filterDisplayEntries(ranked, displayMode, favs, categories),
    [ranked, displayMode, favs, categories],
  )
  const visibleTails = useMemo(() => {
    if (displayMode === "all") return tails
    const ids = new Set(visible.map((r) => r.entry.entry_id))
    return tails.filter((t) => ids.has(t.entry_id))
  }, [tails, visible, displayMode])

  const sosCount = ranked.filter((r) => r.status === "sos").length
  const hasProfileView = event.event_type === "race" && courseIndex != null
  const showMap = viewMode === "map" || !hasProfileView

  function copyWatchLink() {
    const url = `${window.location.origin}/watch/${event.public_token}`
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success("관전 링크를 복사했어요."))
      .catch(() => toast.error("복사에 실패했어요."))
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

      <Tabs defaultValue="live">
        <TabsList>
          <TabsTrigger value="live">관제</TabsTrigger>
          <TabsTrigger value="entries">참가자</TabsTrigger>
          <TabsTrigger value="settings">설정</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="mt-4">
          <div className="theme-light relative h-[calc(100dvh-220px)] min-h-[480px] overflow-hidden rounded-xl border bg-background text-foreground">
            {/* 상단 중앙 — 뷰 전환만 */}
            {hasProfileView && (
              <div className="absolute left-1/2 top-3 z-30 -translate-x-1/2">
                <ViewModeSwitch mode={viewMode} onChange={setViewMode} />
              </div>
            )}

            {/* 레이스 종료 배너 — 지도 위쪽 가운데(컨트롤 아래) */}
            {event.event_type === "race" && event.status === "finished" && (
              <div className="absolute left-1/2 top-14 z-20 -translate-x-1/2">
                <RaceFinishBanner ranked={ranked} />
              </div>
            )}

            {/* 지도 모드 (숨겨도 언마운트하지 않음 — Mapbox 재과금 방지) */}
            <div className={showMap ? "absolute inset-0" : "hidden"}>
              <LiveMap
                bare
                course={info?.trail ?? null}
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
              {/* 2D/3D — 좌측 아래 (모바일 하단 시트가 열려 있으면 시트 위로) */}
              <MapDimensionToggle
                is3d={is3d}
                onChange={setIs3d}
                className={
                  "absolute left-3 z-30 md:bottom-3 " +
                  (panelOpen ? "bottom-[calc(50%+0.75rem)]" : "bottom-3")
                }
              />
              <LiveSidebar
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
                onOpenChange={setPanelOpen}
              />
            </div>

            {/* 고도 모드: 스크롤 — 프로필 + 순위 리스트 */}
            {!showMap && hasProfileView && courseIndex && (
              <div
                className={
                  "h-full overflow-y-auto px-4 pb-8 " +
                  (event.status === "finished" ? "pt-32" : "pt-14")
                }
              >
                <div className="overflow-hidden rounded-2xl bg-background">
                  <ElevationProfile
                    index={courseIndex}
                    entries={visible}
                    categories={categories}
                    checkpoints={info?.trail?.checkpoints}
                    selectedId={selectedId}
                    onSelect={handleSelect}
                    expanded
                    className="h-[42dvh] min-h-[300px]"
                  />
                </div>
                <div className="mt-5">
                  <LiveTableWide
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
        </TabsContent>

        <TabsContent value="entries" className="mt-4">
          <EntryManager eventId={event.id} />
        </TabsContent>

        <TabsContent value="settings" className="mt-4 space-y-6">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold">이벤트 상태</h2>
            <p className="text-xs text-muted-foreground">
              진행중/종료 상태에서만 관전 링크가 열려요. 보관하면 링크가
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

          <div className="space-y-2">
            <h2 className="text-sm font-semibold">관전 링크</h2>
            <div className="flex items-center gap-2">
              <code className="rounded-md border bg-muted px-3 py-1.5 text-xs">
                /watch/{event.public_token}
              </code>
              <Button variant="outline" size="sm" onClick={copyWatchLink}>
                복사
              </Button>
            </div>
          </div>

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
