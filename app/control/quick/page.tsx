"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Plus,
  Search,
  Square,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useSuperAdmin } from "@/hooks/use-super-admin"
import { NATSEONGOT } from "@/lib/events"
import { trackerControlRepo } from "@/lib/repos/trackerControlRepo"
import type {
  EventEntry,
  TrackerDevice,
  TrackerEvent,
} from "@/lib/repos/trackerControlTypes"

/**
 * 빠른 관제 — 지도 고르고 기기를 켜면 바로 관제.
 * 앱을 켜지 않아도 트래커 기기 위치만으로 동작한다.
 * 내부적으로는 진행중(live) 모니터링 이벤트를 만들어 쓰고,
 * 보는 쪽은 관전 링크(/watch/:token)라 로그인 없이 게스트로 볼 수 있다.
 */

const NO_TRAIL = "__none__"
const NEW_TITLE = "빠른 관제"

function deviceName(d: TrackerDevice) {
  return d.label?.trim() || d.user_nickname || `기기 ${d.imei.slice(-4)}`
}

function ago(iso: string | null) {
  if (!iso) return "수신 기록 없음"
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return "방금 수신"
  if (s < 3600) return `${Math.floor(s / 60)}분 전 수신`
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전 수신`
  return `${Math.floor(s / 86400)}일 전 수신`
}

export default function QuickControlPage() {
  const { isAdmin } = useSuperAdmin()
  const [events, setEvents] = useState<TrackerEvent[] | null>(null)
  const [eventId, setEventId] = useState<string | null>(null)
  const [trails, setTrails] = useState<
    { id: string; name: string; distance_km: number | null }[]
  >([])
  const [devices, setDevices] = useState<TrackerDevice[]>([])
  const [entries, setEntries] = useState<EventEntry[]>([])
  const [trailId, setTrailId] = useState(NO_TRAIL)
  const [title, setTitle] = useState("")
  const [query, setQuery] = useState("")
  const [busy, setBusy] = useState<string | null>(null)
  const [previewKey, setPreviewKey] = useState(0)

  const event = useMemo(
    () => events?.find((e) => e.id === eventId) ?? null,
    [events, eventId],
  )

  const loadEvents = useCallback(async () => {
    const all = await trackerControlRepo.listEvents()
    // 진행중인 모니터링 이벤트만 — 최근 것부터
    const live = all
      .filter((e) => e.event_type === "monitor" && e.status === "live")
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
    setEvents(live)
    return live
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    loadEvents()
      .then((live) => setEventId((cur) => cur ?? live[0]?.id ?? null))
      .catch(() => {
        toast.error("관제 목록을 불러오지 못했어요.")
        setEvents([])
      })
    trackerControlRepo
      .listSelectableTrails()
      .then(setTrails)
      .catch(() => toast.error("지도 목록을 불러오지 못했어요."))
    trackerControlRepo
      .listAllDevices()
      .then(setDevices)
      .catch(() => toast.error("기기 목록을 불러오지 못했어요."))
  }, [isAdmin, loadEvents])

  useEffect(() => {
    setTrailId(event?.trail_id ?? NO_TRAIL)
    setTitle(event?.title ?? "")
    if (!event) {
      setEntries([])
      return
    }
    trackerControlRepo
      .listEntries(event.id)
      .then(setEntries)
      .catch(() => toast.error("켜진 기기를 불러오지 못했어요."))
  }, [event])

  /** 이벤트가 없으면 지금 고른 지도로 새로 만든다 (바로 진행중) */
  async function ensureEvent(nextTrail = trailId): Promise<TrackerEvent> {
    if (event) return event
    const created = await trackerControlRepo.upsertEvent({
      id: null,
      title: title.trim() || NEW_TITLE,
      event_type: "monitor",
      trail_id: nextTrail === NO_TRAIL ? null : nextTrail,
      starts_at: new Date().toISOString(),
      ends_at: null,
      status: "live",
    })
    await loadEvents()
    setEventId(created.id)
    return created
  }

  async function changeTrail(next: string) {
    // 행사 코스 지도는 진행중 관제가 생기는 순간 이벤트 페이지에 실제 체크포인트가 공개된다
    if (
      next === NATSEONGOT.courseTrailId &&
      !confirm(
        `${NATSEONGOT.title} 코스 지도예요. 이 지도로 관제를 시작하면 이벤트 페이지에 실제 체크포인트 위치가 바로 공개돼요. 계속할까요?`,
      )
    )
      return
    setTrailId(next)
    setBusy("trail")
    try {
      if (!event) {
        await ensureEvent(next)
      } else {
        await trackerControlRepo.upsertEvent({
          id: event.id,
          title: title.trim() || event.title,
          event_type: "monitor",
          trail_id: next === NO_TRAIL ? null : next,
          starts_at: event.starts_at,
          ends_at: event.ends_at,
          status: null,
        })
        await loadEvents()
      }
      setPreviewKey((k) => k + 1)
      toast.success("지도를 바꿨어요.")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "지도를 바꾸지 못했어요.")
    } finally {
      setBusy(null)
    }
  }

  /** 관제 이름 저장 — 이미 만든 관제면 바로 바꾸고, 아직이면 만들 때 쓴다 */
  async function saveTitle() {
    const next = title.trim()
    if (!event || !next || next === event.title) return
    setBusy("title")
    try {
      await trackerControlRepo.upsertEvent({
        id: event.id,
        title: next,
        event_type: "monitor",
        trail_id: event.trail_id,
        starts_at: event.starts_at,
        ends_at: event.ends_at,
        status: null,
      })
      await loadEvents()
      setPreviewKey((k) => k + 1)
      toast.success("관제 이름을 바꿨어요.")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "이름을 바꾸지 못했어요.")
    } finally {
      setBusy(null)
    }
  }

  async function toggleDevice(d: TrackerDevice, on: boolean) {
    setBusy(d.id)
    try {
      const ev = await ensureEvent()
      if (on) {
        await trackerControlRepo.upsertEntry({
          event_id: ev.id,
          device_id: d.id,
          display_name: deviceName(d),
          user_id: d.user_id,
        })
      } else {
        const entry = entries.find((x) => x.device_id === d.id)
        if (entry) await trackerControlRepo.deleteEntry(entry.id)
      }
      setEntries(await trackerControlRepo.listEntries(ev.id))
      await loadEvents() // 목록의 기기 수 갱신
      setPreviewKey((k) => k + 1)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "기기를 바꾸지 못했어요.")
    } finally {
      setBusy(null)
    }
  }

  async function finish() {
    if (!event) return
    if (!confirm("관제를 끝낼까요? 공유한 링크로는 더 이상 볼 수 없어요.")) return
    setBusy("finish")
    try {
      await trackerControlRepo.upsertEvent({
        id: event.id,
        title: event.title,
        event_type: "monitor",
        trail_id: event.trail_id,
        starts_at: event.starts_at,
        ends_at: new Date().toISOString(),
        status: "archived",
      })
      const live = await loadEvents()
      setEventId(live[0]?.id ?? null)
      toast.success("관제를 끝냈어요.")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "끝내지 못했어요.")
    } finally {
      setBusy(null)
    }
  }

  function startNew() {
    setEventId(null)
    setTrailId(NO_TRAIL)
    setTitle("")
    setEntries([])
  }

  const watchUrl =
    event && typeof window !== "undefined"
      ? `${window.location.origin}/watch/${event.public_token}`
      : null

  function copyLink() {
    if (!watchUrl) return
    navigator.clipboard
      .writeText(watchUrl)
      .then(() => toast.success("게스트 링크를 복사했어요."))
      .catch(() => toast.error("복사에 실패했어요."))
  }

  const onIds = useMemo(() => new Set(entries.map((e) => e.device_id)), [entries])
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return devices
      .filter(
        (d) =>
          !q ||
          deviceName(d).toLowerCase().includes(q) ||
          d.imei.includes(q) ||
          (d.user_nickname ?? "").toLowerCase().includes(q),
      )
      .sort((a, b) => {
        // 켜진 기기 먼저, 그다음 최근 수신 순
        const on = Number(onIds.has(b.id)) - Number(onIds.has(a.id))
        if (on) return on
        return (b.last_seen_at ?? "").localeCompare(a.last_seen_at ?? "")
      })
  }, [devices, query, onIds])

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
          빠른 관제 설정은 관리자만 할 수 있어요. 공유받은 링크가 있다면 그
          링크로 보면 돼요.
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <Link
        href="/control"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        관제
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">빠른 관제</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          지도를 고르고 볼 기기를 켜면 바로 위치가 떠요. 앱을 켜지 않아도
          트래커만 켜져 있으면 돼요. 게스트 링크는 로그인 없이 누구나 볼 수
          있어요.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <section className="space-y-5">
          {(events?.length ?? 0) > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">진행 중인 관제</p>
              <div className="flex gap-2">
                <Select
                  value={eventId ?? "__new__"}
                  onValueChange={(v) => (v === "__new__" ? startNew() : setEventId(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {events!.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.title}
                        {e.trail_name ? ` · ${e.trail_name}` : ""} ({e.entry_count}대)
                      </SelectItem>
                    ))}
                    <SelectItem value="__new__">새로 만들기</SelectItem>
                  </SelectContent>
                </Select>
                {event && (
                  <Button variant="outline" size="icon" onClick={startNew} title="새로 만들기">
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-semibold">관제 이름</p>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur()
              }}
              placeholder={`예: 2026 UTNP 9Peak 답사 (비우면 "${NEW_TITLE}")`}
              maxLength={60}
              disabled={busy === "title"}
            />
            <p className="text-xs text-muted-foreground">
              게스트 화면 맨 위에 보이는 이름이에요.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">1. 지도</p>
            <Select value={trailId} onValueChange={changeTrail} disabled={busy === "trail"}>
              <SelectTrigger>
                <SelectValue placeholder="지도 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_TRAIL}>지도 없이 위치만</SelectItem>
                {trails.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                    {t.distance_km != null && ` · ${t.distance_km.toFixed(1)}km`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">
              2. 볼 기기 켜기{" "}
              <span className="font-normal text-muted-foreground">
                {onIds.size}대 켜짐
              </span>
            </p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="기기 이름, 번호, 회원 검색"
                className="pl-9"
              />
            </div>
            <ul className="max-h-[52vh] divide-y overflow-y-auto rounded-xl border">
              {shown.map((d) => {
                const on = onIds.has(d.id)
                return (
                  <li key={d.id} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{deviceName(d)}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {d.imei}
                        {d.user_nickname && d.label ? `, ${d.user_nickname}` : ""}
                        {" · "}
                        {ago(d.last_seen_at)}
                      </p>
                    </div>
                    <Switch
                      checked={on}
                      disabled={busy !== null}
                      onCheckedChange={(v) => toggleDevice(d, v)}
                      aria-label={`${deviceName(d)} 관제 ${on ? "끄기" : "켜기"}`}
                    />
                  </li>
                )
              })}
              {shown.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                  기기가 없어요
                </li>
              )}
            </ul>
          </div>

          {event && watchUrl && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">3. 게스트 링크</p>
              <p className="break-all rounded-lg border bg-muted/40 px-3 py-2 font-mono text-xs">
                {watchUrl}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={copyLink} className="bg-[#DC2F55] text-white hover:bg-[#DC2F55]/90">
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  링크 복사
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <a href={watchUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                    새 창
                  </a>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/control/${event.id}`}>관리자 관제 화면</Link>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={finish}
                  disabled={busy !== null}
                  className="text-destructive hover:text-destructive"
                >
                  <Square className="mr-1.5 h-3.5 w-3.5" />
                  관제 끝내기
                </Button>
              </div>
            </div>
          )}
        </section>

        <section className="min-h-[60vh] overflow-hidden rounded-2xl border bg-muted/30">
          {event ? (
            <iframe
              key={previewKey}
              src={`/watch/${event.public_token}`}
              title="게스트 화면 미리보기"
              className="h-[75vh] w-full"
            />
          ) : (
            <div className="flex h-full min-h-[60vh] items-center justify-center px-6 text-center text-sm text-muted-foreground">
              지도를 고르거나 기기를 켜면 여기에 게스트가 보는 화면이 떠요.
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
