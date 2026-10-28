"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowLeft, RadioTower } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapDimensionToggle } from "@/components/control/DisplayFilter"
import LiveMap from "@/components/control/LiveMap"
import LiveSidebar from "@/components/control/LiveSidebar"
import { useFavorites } from "@/hooks/use-favorites"
import { useSuperAdmin } from "@/hooks/use-super-admin"
import {
  type MovementAnchor,
  type ProgressState,
  type RankedEntry,
  rankEntries,
} from "@/lib/course-progress"
import { trackerControlRepo } from "@/lib/repos/trackerControlRepo"
import type { DeviceLiveRow, LiveEntry } from "@/lib/repos/trackerControlTypes"

const POLL_MS = 5_000
const UNASSIGNED = "미배정"

/** 기기 행 → 관제 파이프라인 공용 LiveEntry (구분 = 배정 이벤트명, 색 구분 겸용)
 *  라벨의 괄호 부가정보(IMEI 메모 등)는 지도·목록 표시에선 제거 */
function toLiveEntry(d: DeviceLiveRow): LiveEntry {
  const cleanLabel = d.label?.replace(/\s*[(（].*$/, "").trim() || null
  return {
    entry_id: d.device_id,
    display_name:
      d.entry_display_name ?? cleanLabel ?? `…${d.imei.slice(-4)}`,
    bib_no: cleanLabel && d.entry_display_name ? cleanLabel : null,
    category: d.event_title ?? UNASSIGNED,
    lat: d.lat,
    lng: d.lng,
    recorded_at: d.recorded_at,
    speed_kmh: d.speed_kmh,
    device_id: d.device_id,
    fix: d.fix,
    imei: d.imei,
    battery_mv: d.battery_mv,
    battery_pct: d.battery_pct,
    device_last_seen_at: d.last_seen_at,
    sos_at: d.sos_at,
  }
}

/** 전역 기기 관제 — 이벤트와 무관하게 등록된 모든 트래커를 한 화면에.
 *  신규 하드웨어 연결 점검대 겸용 (이벤트 없이 신호 유입·배터리 즉시 확인). */
export default function DevicesControlPage() {
  const { isAdmin } = useSuperAdmin()
  const [rows, setRows] = useState<DeviceLiveRow[] | null>(null)
  const [ranked, setRanked] = useState<RankedEntry[]>([])
  const [lastPolledAt, setLastPolledAt] = useState<number | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focusSignal, setFocusSignal] = useState(0)
  const [is3d, setIs3d] = useState(false)
  const [panelOpen, setPanelOpen] = useState(true)
  const { favs, toggleFav } = useFavorites("devices")

  const progressMapRef = useRef<Map<string, ProgressState>>(new Map())
  const movementMapRef = useRef<Map<string, MovementAnchor>>(new Map())
  const toastedRef = useRef(false)

  const poll = useCallback(async () => {
    if (document.visibilityState === "hidden") return
    try {
      const data = await trackerControlRepo.allDevicesLiveState()
      setRows(data)
      setRanked(
        rankEntries(
          data.map(toLiveEntry),
          null,
          progressMapRef.current,
          Date.now(),
          null,
          movementMapRef.current,
        ),
      )
      setLastPolledAt(Date.now())
      toastedRef.current = false
    } catch {
      if (!toastedRef.current) {
        toastedRef.current = true
        toast.error("기기 목록을 불러오지 못했어요. 자동으로 재시도해요.")
      }
    }
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    poll()
    const timer = setInterval(poll, POLL_MS)
    const onVisible = () => {
      if (document.visibilityState === "visible") poll()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [isAdmin, poll])

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const r of rows ?? []) set.add(r.event_title ?? UNASSIGNED)
    return [...set].sort((a, b) =>
      a === UNASSIGNED ? 1 : b === UNASSIGNED ? -1 : a.localeCompare(b),
    )
  }, [rows])

  const counts = useMemo(() => {
    const total = ranked.length
    const sos = ranked.filter((r) => r.status === "sos").length
    const noSignal = ranked.filter(
      (r) => r.status === "noSignal" || r.status === "stale",
    ).length
    return { total, sos, noSignal, ok: total - sos - noSignal }
  }, [ranked])

  const handleSelect = useCallback((entryId: string) => {
    setSelectedId(entryId)
    setFocusSignal((n) => n + 1)
  }, [])

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

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" title="관제 목록">
            <Link href="/control">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold">
              <RadioTower className="h-5 w-5" />
              전체 기기
            </h1>
            <p className="text-xs text-muted-foreground">
              이벤트와 무관하게 등록된 모든 트래커 — 하드웨어 연결 점검용
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">전체 {counts.total}</Badge>
          <Badge
            variant="outline"
            className="border-emerald-500/50 text-emerald-600"
          >
            수신중 {counts.ok}
          </Badge>
          <Badge
            variant="outline"
            className={
              counts.noSignal > 0
                ? "border-red-500/60 bg-red-500/10 text-red-500"
                : ""
            }
          >
            신호 없음 {counts.noSignal}
          </Badge>
          {counts.sos > 0 && (
            <Badge variant="destructive">SOS {counts.sos}</Badge>
          )}
          {lastPolledAt && (
            <span className="tabular-nums">
              {Math.max(0, Math.round((Date.now() - lastPolledAt) / 1000))}초 전
              갱신
            </span>
          )}
        </div>
      </div>

      <div className="theme-light relative h-[calc(100dvh-180px)] min-h-[480px] overflow-hidden rounded-xl border bg-background text-foreground">
        <LiveMap
          bare
          course={null}
          entries={ranked}
          tails={[]}
          categories={categories}
          selectedId={selectedId}
          onSelect={handleSelect}
          focusSignal={focusSignal}
          enable3d={is3d}
          height="100%"
          className="absolute inset-0"
        />
        <MapDimensionToggle
          is3d={is3d}
          onChange={setIs3d}
          className={
            "absolute left-3 z-30 md:bottom-3 " +
            (panelOpen ? "bottom-[calc(40%+0.75rem)]" : "bottom-3")
          }
        />
        <LiveSidebar
          ranked={ranked}
          eventType="monitor"
          isAdmin
          categories={categories}
          selectedId={selectedId}
          onSelect={handleSelect}
          favs={favs}
          onToggleFav={toggleFav}
          onOpenChange={setPanelOpen}
          noun="기기"
        />
      </div>
    </main>
  )
}
