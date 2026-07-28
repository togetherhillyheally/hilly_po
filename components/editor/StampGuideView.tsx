"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { Loader2, Pencil, Stamp as StampIcon, Star } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import StampMap from "@/components/map/StampMap"
import { parseStampTitle } from "@/lib/stamp-pool"
import type { StampPointDraft } from "@/lib/repos/stampRepo"
import {
  trailReviewsRepo,
  type TrailReview,
  type TrailReviewAggregate,
} from "@/lib/repos/trailReviews"
import type { Trail } from "@/lib/repos/trailTypes"

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate(),
  ).padStart(2, "0")}`
}

export default function StampGuideView({
  trail,
  points,
  loading,
  onEdit,
}: {
  trail: Trail
  points: StampPointDraft[]
  loading: boolean
  onEdit: () => void
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loadingExtra, setLoadingExtra] = useState(true)
  const [trailReviews, setTrailReviews] = useState<TrailReview[]>([])
  const [aggregate, setAggregate] = useState<TrailReviewAggregate | null>(
    null,
  )
  const cardRefs = useRef(new Map<string, HTMLLIElement>())

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoadingExtra(true)
      try {
        const [tRevs, agg] = await Promise.all([
          trailReviewsRepo.listByTrail(trail.id),
          trailReviewsRepo.getAggregate(trail.id),
        ])
        if (cancelled) return
        setTrailReviews(tRevs)
        setAggregate(agg)
      } catch {
        if (!cancelled) toast.error("반응을 불러오지 못했어요.")
      } finally {
        if (!cancelled) setLoadingExtra(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [trail.id])

  const mapPoints = useMemo(
    () =>
      points.map((p, i) => ({
        id: p.id,
        title: p.title,
        lng: p.lng,
        lat: p.lat,
        sort_order: i + 1,
      })),
    [points],
  )

  function scrollToPoint(id: string) {
    setActiveId(id)
    cardRefs.current.get(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
  }

  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100vh-3.5rem)] lg:flex-row lg:gap-0">
      {/* 지도 (읽기 전용) */}
      <div className="relative flex-1 p-4 lg:pr-2">
        <StampMap
          points={mapPoints}
          bounds={trail.bounds ?? undefined}
          selectedId={activeId}
          onMarkerClick={scrollToPoint}
          height="100%"
          className="min-h-[420px] lg:h-full"
        />
      </div>

      {/* 우측 패널 */}
      <aside className="w-full shrink-0 space-y-4 overflow-y-auto p-4 lg:w-96 lg:pl-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold">{trail.name}</h1>
            <p className="text-xs text-muted-foreground">
              스탬프지도 · 스탬프 {points.length}개
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            수정
          </Button>
        </div>

        <div className="rounded-lg border p-2.5 text-center">
          <p className="flex items-center justify-center gap-1 text-sm font-bold">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {aggregate?.average ?? "–"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            지도 리뷰 {aggregate?.count ?? 0}
          </p>
        </div>

        {trailReviews.length > 0 && (
          <div className="space-y-2 rounded-xl border p-3.5">
            <p className="text-xs font-semibold text-muted-foreground">
              지도 리뷰
            </p>
            {trailReviews.map((r) => (
              <div key={r.id} className="flex gap-2 text-sm">
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarImage src={r.author_avatar_url ?? undefined} />
                  <AvatarFallback className="text-[10px]">
                    {(r.author_nickname ?? "?").slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium">
                      {r.author_nickname ?? "알 수 없음"}
                    </span>
                    {r.rating != null && (
                      <span className="flex items-center gap-0.5 text-[11px] text-amber-500">
                        <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                        {r.rating}
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      {formatDate(r.created_at)}
                    </span>
                  </div>
                  {r.body && (
                    <p className="mt-0.5 whitespace-pre-wrap">{r.body}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {loading || loadingExtra ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : points.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            <StampIcon className="mx-auto mb-2 h-6 w-6" />
            아직 스탬프가 없어요.
            <br />
            &ldquo;수정&rdquo;을 눌러 첫 스탬프를 추가해 보세요.
          </div>
        ) : (
          <ul className="space-y-2">
            {points.map((p, i) => {
              const { entry, name: pointName } = parseStampTitle(p.title)
              const Icon = entry?.Icon
              return (
                <li
                  key={p.id}
                  ref={(el) => {
                    if (el) cardRefs.current.set(p.id, el)
                    else cardRefs.current.delete(p.id)
                  }}
                  className={`space-y-1.5 rounded-xl border p-3.5 transition-colors ${
                    activeId === p.id ? "border-foreground/40 bg-muted/50" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 bg-white"
                      style={{ borderColor: entry?.color ?? "#fb923c" }}
                    >
                      {Icon ? (
                        <Icon
                          className="h-3.5 w-3.5"
                          style={{ color: entry?.color }}
                        />
                      ) : (
                        <span className="text-xs font-bold">{i + 1}</span>
                      )}
                    </span>
                    <span className="w-4 shrink-0 text-xs tabular-nums text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {pointName || "스탬프"}
                    </span>
                  </div>
                  {p.hint && (
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {p.hint}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </aside>
    </div>
  )
}
