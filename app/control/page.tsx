"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  Link2,
  MapPin,
  Plus,
  Radio,
  Route,
  Timer,
  Trash2,
  Users,
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import EventFormDialog from "@/components/control/EventFormDialog"
import LiveIntervalDialog from "@/components/control/LiveIntervalDialog"
import { useSuperAdmin } from "@/hooks/use-super-admin"
import {
  type LiveAdventure,
  liveAdventureRepo,
} from "@/lib/repos/liveAdventureRepo"
import { trackerControlRepo } from "@/lib/repos/trackerControlRepo"
import { trailThumbnailUrl } from "@/lib/repos/trailThumbnail"
import type { TrackerEvent } from "@/lib/repos/trackerControlTypes"

type TrailCard = { thumbnail_path: string | null; distance_km: number | null }

function formatStart(iso: string | null): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** LIVE(초록 펄스) / 예정 / 종료 / 보관 상태 배지 */
function StatusBadge({ status }: { status: TrackerEvent["status"] }) {
  if (status === "live")
    return (
      <Badge className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-600">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
        </span>
        LIVE
      </Badge>
    )
  if (status === "finished") return <Badge variant="secondary">종료</Badge>
  if (status === "archived")
    return (
      <Badge variant="outline" className="bg-background/70 text-muted-foreground">
        보관
      </Badge>
    )
  return (
    <Badge className="border-transparent bg-amber-500 text-white hover:bg-amber-500">
      준비중
    </Badge>
  )
}

/** 카드 상단 썸네일 — 코스 썸네일 or 그라데이션 폴백 */
function CardThumb({
  thumb,
  children,
}: {
  thumb: string | null
  children?: React.ReactNode
}) {
  const [failed, setFailed] = useState(false)
  return (
    <div className="relative aspect-[16/7] overflow-hidden bg-muted">
      {thumb && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumb}
          alt=""
          onError={() => setFailed(true)}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-[radial-gradient(80%_120%_at_50%_0%,rgba(220,47,85,0.12),transparent_65%)] text-muted-foreground">
          <Route className="h-8 w-8" />
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />
      {children}
    </div>
  )
}

export default function ControlListPage() {
  const { isAdmin } = useSuperAdmin()
  const [events, setEvents] = useState<TrackerEvent[] | null>(null)
  const [adventures, setAdventures] = useState<LiveAdventure[] | null>(null)
  const [trailCards, setTrailCards] = useState<Map<string, TrailCard>>(
    new Map(),
  )
  const [formOpen, setFormOpen] = useState(false)
  const [intervalOpen, setIntervalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<TrackerEvent | null>(null)

  const reload = useCallback(async () => {
    let evs: TrackerEvent[] = []
    let advs: LiveAdventure[] = []
    try {
      evs = await trackerControlRepo.listEvents()
      setEvents(evs)
    } catch {
      toast.error("이벤트 목록을 불러오지 못했어요.")
      setEvents([])
    }
    try {
      advs = await liveAdventureRepo.listLiveAdventures()
      setAdventures(advs)
    } catch {
      setAdventures([])
    }
    try {
      const ids = [
        ...evs.map((e) => e.trail_id),
        ...advs.map((a) => a.trail_id),
      ].filter((v): v is string => Boolean(v))
      setTrailCards(await trackerControlRepo.fetchTrailCards(ids))
    } catch {
      // 썸네일은 부가 정보 — 실패해도 목록은 표시
    }
  }, [])

  useEffect(() => {
    if (isAdmin) reload()
  }, [isAdmin, reload])

  function copyWatchLink(ev: TrackerEvent) {
    const url = `${window.location.origin}/watch/${ev.public_token}`
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success("관전 링크를 복사했어요."))
      .catch(() => toast.error("복사에 실패했어요."))
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await trackerControlRepo.deleteEvent(deleteTarget.id)
      toast.success("이벤트를 삭제했어요.")
      setDeleteTarget(null)
      reload()
    } catch {
      toast.error("삭제에 실패했어요.")
    }
  }

  if (isAdmin === null) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-muted-foreground">
        확인 중…
      </main>
    )
  }
  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h1 className="text-lg font-bold">접근 권한이 없어요</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          관제 화면은 관리자만 사용할 수 있어요.
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">관제</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            트래커 이벤트를 만들고 실시간 위치를 관제해요.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIntervalOpen(true)}
            title="모험 신호 주기 설정"
          >
            <Timer className="mr-1.5 h-4 w-4" />
            신호 주기
          </Button>
          <Button
            onClick={() => setFormOpen(true)}
            className="bg-[#DC2F55] text-white hover:bg-[#DC2F55]/90"
          >
            <Plus className="mr-1.5 h-4 w-4" />새 이벤트
          </Button>
        </div>
      </div>

      {/* ── 트래커 이벤트 (UTMB 허브식 카드) ── */}
      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          트래커 이벤트
        </h2>
        {events === null ? (
          <p className="rounded-2xl border px-4 py-10 text-center text-sm text-muted-foreground">
            불러오는 중…
          </p>
        ) : events.length === 0 ? (
          <p className="rounded-2xl border px-4 py-10 text-center text-sm text-muted-foreground">
            아직 이벤트가 없어요. 새 이벤트를 만들어 보세요.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((ev) => {
              const card = ev.trail_id ? trailCards.get(ev.trail_id) : null
              const start = formatStart(ev.starts_at)
              return (
                <div
                  key={ev.id}
                  className="group overflow-hidden rounded-2xl border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/25 hover:shadow-lg"
                >
                  <Link href={`/control/${ev.id}`} className="block">
                    <CardThumb
                      thumb={trailThumbnailUrl(card?.thumbnail_path)}
                    >
                      <div className="absolute left-3 top-3 flex gap-1.5">
                        <StatusBadge status={ev.status} />
                      </div>
                      <Badge
                        variant="secondary"
                        className="absolute right-3 top-3 shadow"
                      >
                        {ev.event_type === "race" ? "대회" : "모니터링"}
                      </Badge>
                    </CardThumb>
                  </Link>
                  <div className="p-4">
                    <Link
                      href={`/control/${ev.id}`}
                      className="block truncate text-base font-bold hover:underline"
                    >
                      {ev.title}
                    </Link>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                      {ev.trail_name && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {ev.trail_name}
                        </span>
                      )}
                      {card?.distance_km != null && (
                        <span className="tabular-nums">
                          {card.distance_km.toFixed(1)}km
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {ev.entry_count}명
                      </span>
                    </p>
                    {start && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {start} 시작
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-1.5">
                      <Button
                        asChild
                        size="sm"
                        className="flex-1 bg-[#DC2F55] text-white hover:bg-[#DC2F55]/90"
                      >
                        <Link href={`/control/${ev.id}`}>
                          <Radio className="mr-1.5 h-4 w-4" />
                          관제 열기
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        title="관전 링크 복사"
                        onClick={() => copyWatchLink(ev)}
                      >
                        <Link2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-red-500"
                        title="삭제"
                        onClick={() => setDeleteTarget(ev)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── 모험 라이브 (앱 hiking_sessions) ── */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          모험 라이브
          <span className="font-normal">앱에서 진행 중인 모험</span>
        </h2>
        {adventures === null ? (
          <p className="rounded-2xl border px-4 py-10 text-center text-sm text-muted-foreground">
            불러오는 중…
          </p>
        ) : adventures.length === 0 ? (
          <p className="rounded-2xl border px-4 py-10 text-center text-sm text-muted-foreground">
            지금 진행 중인 모험이 없어요.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {adventures.map((a) => {
              const card = a.trail_id ? trailCards.get(a.trail_id) : null
              const start = formatStart(a.started_at)
              return (
                <Link
                  key={a.id}
                  href={`/control/live/${a.id}`}
                  className="group overflow-hidden rounded-2xl border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/25 hover:shadow-lg"
                >
                  <CardThumb thumb={trailThumbnailUrl(card?.thumbnail_path)}>
                    <div className="absolute left-3 top-3 flex gap-1.5">
                      {a.live_count > 0 ? (
                        <Badge className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-600">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                          </span>
                          LIVE {a.live_count}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">신호 대기</Badge>
                      )}
                    </div>
                    <Badge
                      variant="secondary"
                      className="absolute right-3 top-3 shadow"
                    >
                      {a.is_solo ? "솔로" : "그룹"}
                    </Badge>
                  </CardThumb>
                  <div className="p-4">
                    <p className="truncate text-base font-bold">{a.title}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {a.mountain_name}
                      </span>
                      {card?.distance_km != null && (
                        <span className="tabular-nums">
                          {card.distance_km.toFixed(1)}km
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {a.total_count}명
                      </span>
                    </p>
                    {start && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {start} 시작
                      </p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      <EventFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        event={null}
        onSaved={reload}
      />

      <LiveIntervalDialog open={intervalOpen} onOpenChange={setIntervalOpen} />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>이벤트를 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.title}&rdquo; 이벤트와 참가자 목록이
              삭제돼요. 기기의 위치 기록은 삭제되지 않아요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}
