"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Share2 } from "lucide-react"
import { toast } from "sonner"
import AdCard from "@/components/broadcast/AdCard"
import BroadcastPanel from "@/components/broadcast/BroadcastPanel"
import SponsorPanel from "@/components/broadcast/SponsorPanel"
import { MapDimensionToggle } from "@/components/control/DisplayFilter"
import ElapsedClock from "@/components/control/ElapsedClock"
import ElevationDrawer from "@/components/control/ElevationDrawer"
import LiveMap from "@/components/control/LiveMap"
import LiveSidebar, {
  type SheetSnap,
  aboveSheetClass,
  atSheetTopClass,
  mapCtrlBottomStyle,
} from "@/components/control/LiveSidebar"
import { useBroadcast } from "@/hooks/use-broadcast"
import { useBroadcastAds } from "@/hooks/use-broadcast-ads"
import { useCurrentUser } from "@/hooks/use-current-user"
import { useFavorites } from "@/hooks/use-favorites"
import { useLiveAdventure } from "@/hooks/use-live-adventure"
import { useSuperAdmin } from "@/hooks/use-super-admin"
import { buildProfileIndex } from "@/lib/course-progress"
import { liveAdventureRepo } from "@/lib/repos/liveAdventureRepo"
import { trailRepo } from "@/lib/repos/trailRepo"
import type { EventCourse } from "@/lib/repos/trackerControlTypes"
import type { PublicBroadcast } from "@/lib/repos/broadcastTypes"
import { nameInitial } from "@/lib/entry-colors"
import { shareLink } from "@/lib/share-link"

/**
 * 개인 도전 중계 /live/<slug> — 앱에서 "공개 중계"를 켠 모험. 로그인 없이 위치·경과·소개·채팅을 본다.
 * 지도·시트 부품은 관전 페이지와 같고, 시트에 [참가자 | 채팅] 탭이 붙는다.
 * 트래커 이벤트 방송이면 관전 페이지(/watch/<token>)로 보낸다.
 */
export default function LivePage() {
  const params = useParams<{ key: string }>()
  const key = decodeURIComponent(params.key)
  const router = useRouter()
  const { broadcast, loading, notFound } = useBroadcast({ key })

  useEffect(() => {
    if (broadcast?.kind === "tracker_event" && broadcast.public_token) {
      router.replace(`/watch/${broadcast.public_token}`)
    }
  }, [broadcast, router])

  if (loading) {
    return (
      <main className="theme-light flex min-h-[100dvh] items-center justify-center bg-background text-sm text-muted-foreground">
        불러오는 중…
      </main>
    )
  }
  if (notFound || !broadcast) {
    return (
      <main className="theme-light flex min-h-[100dvh] flex-col items-center justify-center bg-background px-6 text-center text-foreground">
        <h1 className="text-lg font-bold">끝났거나 없는 중계예요</h1>
        <p className="mt-2 text-sm text-muted-foreground">링크를 다시 확인해 주세요.</p>
      </main>
    )
  }
  if (broadcast.kind === "tracker_event") {
    return (
      <main className="theme-light flex min-h-[100dvh] items-center justify-center bg-background text-sm text-muted-foreground">
        관전 페이지로 이동 중…
      </main>
    )
  }
  return <AdventureLive broadcast={broadcast} />
}

/** 세션이 아직 출발 전이면 public_adventure_live 가 비어 있다 — 코스만 따로 그린다 */
function useFallbackCourse(trailId: string | null, enabled: boolean) {
  const [course, setCourse] = useState<EventCourse | null>(null)
  useEffect(() => {
    if (!enabled || !trailId) return
    let cancelled = false
    ;(async () => {
      try {
        const [trail, checkpoints] = await Promise.all([
          trailRepo.getTrailById(trailId),
          liveAdventureRepo.listCheckpoints(trailId),
        ])
        if (!cancelled && trail?.coordinates) {
          setCourse({
            name: trail.name,
            distance_km: trail.distance_km,
            bounds: trail.bounds,
            center: trail.center,
            coordinates: trail.coordinates,
            checkpoints,
          })
        }
      } catch {
        // 코스 없이 지도만
      }
    })()
    return () => {
      cancelled = true
    }
  }, [trailId, enabled])
  return course
}

function AdventureLive({ broadcast }: { broadcast: PublicBroadcast }) {
  const live = useLiveAdventure(broadcast.ref_id)
  const { user } = useCurrentUser()
  const { isAdmin } = useSuperAdmin()
  const isHost = !!user && (broadcast.host?.user_id === user.id || isAdmin === true)
  const fallbackCourse = useFallbackCourse(broadcast.trail_id, !live.loading && !live.course)
  // 광고 — 시트 머리 아래 1장, 끝난 중계엔 종료 배너 자리 1장 (채팅 사이는 BroadcastPanel 이)
  const ads = useBroadcastAds(broadcast.id, "hiking_session")
  const course = live.course ?? fallbackCourse
  const profileIndex = useMemo(
    () => live.courseIndex ?? buildProfileIndex(course?.coordinates),
    [live.courseIndex, course],
  )

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focusSignal, setFocusSignal] = useState(0)
  const [is3d, setIs3d] = useState(false)
  const [sheet, setSheet] = useState<SheetSnap>("peek")
  const [elevOpen, setElevOpen] = useState(false)
  const [terrainElevations, setTerrainElevations] = useState<Map<string, number> | null>(null)
  const { favs, toggleFav } = useFavorites(`live-${broadcast.id}`)
  const handleSelect = (id: string) => {
    setSelectedId(id)
    setFocusSignal((n) => n + 1)
  }

  const session = live.session
  const ended = broadcast.status === "ended"
  const preStart = !session // 출발 전(위치 없음) 또는 아직 비공개
  const eventType: "race" | "monitor" = live.courseIndex ? "race" : "monitor"
  const hostName = broadcast.host?.nickname ?? "도전자"

  async function onShare() {
    const r = await shareLink(window.location.href, `${broadcast.title} · 힐리힐리 LIVE`)
    if (r === "copied") toast.success("중계 링크를 복사했어요.")
    else if (r === "failed") toast.error("공유하지 못했어요.")
  }
  const shareButton = (
    <button
      type="button"
      onClick={() => void onShare()}
      aria-label="중계 링크 공유"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background/70 text-foreground transition-colors hover:bg-background active:scale-95"
    >
      <Share2 className="h-4 w-4" />
    </button>
  )
  const hostChip = (
    <span className="flex items-center gap-1.5">
      <span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-[#DC2F55] text-[10px] font-bold text-white">
        {broadcast.host?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={broadcast.host.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          nameInitial(hostName)
        )}
      </span>
      <span className="truncate">{hostName}의 도전</span>
    </span>
  )
  const statusChip = ended ? (
    <span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold">종료</span>
  ) : (
    <span className="flex items-center gap-1 rounded-full bg-[#DC2F55] px-2 py-1 text-[11px] font-extrabold text-white">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
      LIVE
    </span>
  )

  // 모바일 시트 머리 — 제목 · 도전자 · 소개 · 경과
  const sheetInfo = (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-bold leading-tight">{broadcast.title}</h1>
          <p className="mt-0.5 flex min-w-0 items-center gap-x-2 text-[11px] text-muted-foreground">
            {hostChip}
            {course?.name && <span className="truncate">· {course.name}</span>}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {session?.started_at && !ended ? (
            <ElapsedClock startsAt={session.started_at} stacked />
          ) : (
            statusChip
          )}
          {shareButton}
        </div>
      </div>
      {broadcast.intro && <p className="line-clamp-2 text-xs leading-snug text-foreground/80">{broadcast.intro}</p>}
      {ended && ads.ads.finish_banner ? (
        <AdCard ad={ads.ads.finish_banner} variant="wide" onImpression={ads.impression} onClick={ads.click} />
      ) : ads.ads.sheet_header ? (
        <AdCard ad={ads.ads.sheet_header} variant="banner" onImpression={ads.impression} onClick={ads.click} />
      ) : null}
    </div>
  )

  const tabs = [
    {
      key: "chat",
      label: "채팅",
      badge: broadcast.message_count || null,
      node: <BroadcastPanel broadcast={broadcast} isHost={isHost} />,
    },
    ...(broadcast.sponsor_enabled
      ? [
          {
            key: "sponsor",
            label: "후원",
            badge: broadcast.sponsor_count || null,
            node: <SponsorPanel broadcast={broadcast} isHost={isHost} />,
          },
        ]
      : []),
  ]

  return (
    <main className="theme-light relative min-h-[100dvh] w-full bg-background text-foreground">
      <div className="absolute inset-0 overflow-hidden" style={mapCtrlBottomStyle(sheet)}>
        <LiveMap
          bare
          course={course}
          enableGeolocate
          entries={live.ranked}
          tails={[]}
          categories={[]}
          selectedId={selectedId}
          onSelect={handleSelect}
          focusSignal={focusSignal}
          enable3d={is3d}
          groupRadiusM={50}
          onElevations={setTerrainElevations}
          height="100%"
          className="absolute inset-0"
        />

        {/* 데스크톱 좌상단 카드 — 모바일은 시트 머리에 있어 시트를 접었을 때만 */}
        <header
          className={
            "absolute left-3 top-3 z-10 max-w-[calc(100%-4.5rem)] rounded-xl border bg-background/85 px-3 py-2 shadow-lg backdrop-blur md:left-4 md:top-4 md:block md:max-w-sm md:px-4 md:py-3 " +
            (sheet !== "closed" ? "hidden" : "")
          }
        >
          <p className="hidden text-[10px] font-bold tracking-tight text-muted-foreground md:block">
            HILLY HEALLY LIVE
          </p>
          <div className="flex items-start justify-between gap-3">
            <h1 className="truncate text-sm font-bold leading-tight md:text-base">{broadcast.title}</h1>
            <div className="flex shrink-0 items-center gap-2">
              {statusChip}
              {shareButton}
            </div>
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground md:text-xs">
            {hostChip}
            {course?.name && <span>{course.name}</span>}
            {profileIndex && <span className="tabular-nums">{(profileIndex.totalM / 1000).toFixed(1)}km</span>}
            {session?.started_at && !ended && <ElapsedClock startsAt={session.started_at} />}
          </p>
          {broadcast.intro && (
            <p className="mt-1.5 hidden text-xs leading-snug text-foreground/80 md:block">{broadcast.intro}</p>
          )}
          {preStart && !ended && (
            <p className="mt-1.5 text-xs text-muted-foreground">아직 출발 전이에요. 출발하면 위치가 보여요.</p>
          )}
          {/* 데스크톱 광고 — 카드 아래 (모바일은 시트 머리에서) */}
          {(ended ? ads.ads.finish_banner : ads.ads.sheet_header) && (
            <div className="mt-2 hidden md:block">
              <AdCard
                ad={(ended ? ads.ads.finish_banner : ads.ads.sheet_header)!}
                variant="banner"
                onImpression={ads.impression}
                onClick={ads.click}
              />
            </div>
          )}
        </header>

        {/* 좌측 아래 도구 줄 */}
        <div
          className={
            "absolute left-4 z-30 flex items-center gap-2 md:bottom-4 " +
            (elevOpen ? "max-md:hidden " : "") +
            aboveSheetClass(sheet)
          }
        >
          <MapDimensionToggle is3d={is3d} onChange={setIs3d} />
        </div>

        {profileIndex && (
          <ElevationDrawer
            index={profileIndex}
            entries={live.ranked}
            categories={[]}
            checkpoints={course?.checkpoints}
            selectedId={selectedId}
            onSelect={handleSelect}
            onOpenChange={setElevOpen}
            className={
              "absolute z-20 md:left-20 md:right-[376px] md:bottom-4 " +
              (elevOpen ? "left-0 right-0 " + atSheetTopClass(sheet) : "left-20 right-4 " + aboveSheetClass(sheet))
            }
          />
        )}

        <LiveSidebar
          ranked={live.ranked}
          eventType={eventType}
          isAdmin={false}
          preStart={preStart}
          loading={!preStart && live.lastPolledAt == null}
          categories={[]}
          selectedId={selectedId}
          onSelect={handleSelect}
          favs={favs}
          onToggleFav={toggleFav}
          terrainElevations={terrainElevations}
          onSnapChange={setSheet}
          mobileHeader={sheetInfo}
          single={session?.is_solo ?? true}
          noun="참가자"
          tabs={tabs}
          initialTab="chat"
        />
      </div>
    </main>
  )
}
