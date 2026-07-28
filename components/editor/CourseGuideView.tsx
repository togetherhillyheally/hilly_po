"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { Loader2, MapPin, Pencil, Sprout, Star } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import CheckpointMap from "@/components/map/CheckpointMap"
import {
  checkpointRepo,
  type CheckpointReview,
  type CheckpointSeed,
} from "@/lib/repos/checkpointRepo"
import {
  trailReviewsRepo,
  type TrailReview,
  type TrailReviewAggregate,
} from "@/lib/repos/trailReviews"
import { checkpointPhotoThumbUrl } from "@/lib/repos/trailTypes"
import { sortCheckpointsAlongPath } from "@/lib/checkpoint-order"
import type {
  Trail,
  TrailCheckpoint,
  TrailCheckpointPhoto,
} from "@/lib/repos/trailTypes"
import { getMarkerEntry, CHECKPOINT_MARKER_BG } from "@/lib/checkpoint-markers"

const COMMENT_PREVIEW_COUNT = 3

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate(),
  ).padStart(2, "0")}`
}

export default function CourseGuideView({
  trail,
  checkpoints,
  loading,
  onEdit,
}: {
  trail: Trail
  checkpoints: TrailCheckpoint[]
  loading: boolean
  onEdit: () => void
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [loadingExtra, setLoadingExtra] = useState(true)
  const [photos, setPhotos] = useState<TrailCheckpointPhoto[]>([])
  const [reviews, setReviews] = useState<CheckpointReview[]>([])
  const [seeds, setSeeds] = useState<CheckpointSeed[]>([])
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
        const [ph, rv, sd, tRevs, agg] = await Promise.all([
          checkpointRepo.listCheckpointPhotosForTrail(trail.id),
          checkpointRepo.listCheckpointReviewsForTrail(trail.id),
          checkpointRepo.listCheckpointSeedsForTrail(trail.id),
          trailReviewsRepo.listByTrail(trail.id),
          trailReviewsRepo.getAggregate(trail.id),
        ])
        if (cancelled) return
        setPhotos(ph)
        setReviews(rv)
        setSeeds(sd)
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

  const orderedCheckpoints = useMemo(
    () => sortCheckpointsAlongPath(checkpoints, trail.coordinates),
    [checkpoints, trail.coordinates],
  )

  const photosByCp = useMemo(() => {
    const map = new Map<string, TrailCheckpointPhoto[]>()
    for (const p of photos) {
      const arr = map.get(p.checkpoint_id) ?? []
      arr.push(p)
      map.set(p.checkpoint_id, arr)
    }
    return map
  }, [photos])

  const reviewsByCp = useMemo(() => {
    const map = new Map<string, CheckpointReview[]>()
    for (const r of reviews) {
      const arr = map.get(r.checkpoint_id) ?? []
      arr.push(r)
      map.set(r.checkpoint_id, arr)
    }
    return map
  }, [reviews])

  const seedCountByCp = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of seeds) {
      map.set(s.checkpoint_id, (map.get(s.checkpoint_id) ?? 0) + 1)
    }
    return map
  }, [seeds])

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function scrollToCheckpoint(id: string) {
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
        <CheckpointMap
          coordinates={
            (trail.coordinates ?? []) as
              | [number, number][]
              | [number, number][][]
          }
          bounds={trail.bounds ?? undefined}
          start={
            trail.start_lat != null && trail.start_lng != null
              ? { lat: trail.start_lat, lng: trail.start_lng }
              : null
          }
          end={
            trail.end_lat != null && trail.end_lng != null
              ? { lat: trail.end_lat, lng: trail.end_lng }
              : null
          }
          checkpoints={orderedCheckpoints.map((c, i) => ({
            id: c.id,
            lng: c.lng,
            lat: c.lat,
            title: c.title,
            sort_order: i + 1,
            marker_icon: c.marker_icon,
          }))}
          selectedId={activeId}
          onMarkerClick={scrollToCheckpoint}
          height="100%"
          className="min-h-[420px] lg:h-full"
        />
      </div>

      {/* 우측 블로그형 패널 */}
      <aside className="w-full shrink-0 space-y-4 overflow-y-auto p-4 lg:w-96 lg:pl-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold">{trail.name}</h1>
            <p className="text-xs text-muted-foreground">
              코스지도 · 체크포인트 {checkpoints.length}개
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            수정
          </Button>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 rounded-lg border p-2.5 text-center">
            <p className="flex items-center justify-center gap-1 text-sm font-bold">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {aggregate?.average ?? "–"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              지도 리뷰 {aggregate?.count ?? 0}
            </p>
          </div>
          <div className="flex-1 rounded-lg border p-2.5 text-center">
            <p className="text-sm font-bold">{reviews.length}</p>
            <p className="text-[11px] text-muted-foreground">체크포인트 댓글</p>
          </div>
          <div className="flex-1 rounded-lg border p-2.5 text-center">
            <p className="flex items-center justify-center gap-1 text-sm font-bold">
              <Sprout className="h-3.5 w-3.5 text-emerald-500" />
              {seeds.length}
            </p>
            <p className="text-[11px] text-muted-foreground">좋아요</p>
          </div>
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
        ) : checkpoints.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            <MapPin className="mx-auto mb-2 h-6 w-6" />
            아직 체크포인트가 없어요.
            <br />
            &ldquo;수정&rdquo;을 눌러 첫 체크포인트를 추가해 보세요.
          </div>
        ) : (
          <ul className="space-y-3">
            {orderedCheckpoints.map((cp, i) => {
              const cpPhotos = photosByCp.get(cp.id) ?? []
              const cpReviews = reviewsByCp.get(cp.id) ?? []
              const likeCount = seedCountByCp.get(cp.id) ?? 0
              const entry = getMarkerEntry(cp.marker_icon)
              const isExpanded = expandedIds.has(cp.id)
              const visibleReviews = isExpanded
                ? cpReviews
                : cpReviews.slice(0, COMMENT_PREVIEW_COUNT)
              const hiddenCount = cpReviews.length - visibleReviews.length
              return (
                <li
                  key={cp.id}
                  ref={(el) => {
                    if (el) cardRefs.current.set(cp.id, el)
                    else cardRefs.current.delete(cp.id)
                  }}
                  className={`space-y-3 rounded-xl border p-3.5 transition-colors ${
                    activeId === cp.id
                      ? "border-foreground/40 bg-muted/50"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2"
                      style={{
                        background: CHECKPOINT_MARKER_BG,
                        borderColor: entry.accent,
                      }}
                    >
                      <entry.Icon
                        className="h-3.5 w-3.5"
                        style={{ color: entry.accent }}
                        strokeWidth={2.2}
                      />
                    </span>
                    <span className="w-4 shrink-0 text-xs tabular-nums text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {cp.title}
                    </span>
                    <span className="flex shrink-0 items-center gap-0.5 text-xs text-muted-foreground">
                      <Sprout className="h-3.5 w-3.5 text-emerald-500" />
                      {likeCount}
                    </span>
                  </div>

                  {cpPhotos.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto">
                      {cpPhotos.map((p) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={p.id}
                          src={checkpointPhotoThumbUrl(p, 400)}
                          alt=""
                          className="h-32 w-32 shrink-0 rounded-lg object-cover"
                        />
                      ))}
                    </div>
                  )}

                  {cp.note && (
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {cp.note}
                    </p>
                  )}

                  <div className="space-y-2 border-t pt-2.5">
                    <p className="text-xs font-medium text-muted-foreground">
                      댓글 {cpReviews.length}
                    </p>
                    {cpReviews.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        아직 댓글이 없어요.
                      </p>
                    ) : (
                      <>
                        {visibleReviews.map((r) => (
                          <div key={r.id} className="flex gap-2">
                            <Avatar className="h-6 w-6 shrink-0">
                              <AvatarImage
                                src={r.author_avatar_url ?? undefined}
                              />
                              <AvatarFallback className="text-[10px]">
                                {(r.author_nickname ?? "?").slice(0, 1)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-medium">
                                  {r.author_nickname ?? "알 수 없음"}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  {formatDate(r.created_at)}
                                </span>
                              </div>
                              <p className="mt-0.5 whitespace-pre-wrap text-sm">
                                {r.body}
                              </p>
                            </div>
                          </div>
                        ))}
                        {cpReviews.length > COMMENT_PREVIEW_COUNT && (
                          <button
                            type="button"
                            onClick={() => toggleExpanded(cp.id)}
                            className="text-xs font-medium text-muted-foreground hover:text-foreground"
                          >
                            {isExpanded ? "접기" : `댓글 ${hiddenCount}개 더보기`}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </aside>
    </div>
  )
}
