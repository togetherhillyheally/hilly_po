"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import { Link2, MapPin, Mountain, Route, Smartphone, Stamp } from "lucide-react"
import {
  APP_STORE_URL,
  PLAY_STORE_URL,
  attemptOpenApp,
  detectPlatform,
} from "@/lib/open-app"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MapDimensionToggle } from "@/components/control/DisplayFilter"
import LiveMap from "@/components/control/LiveMap"
import {
  CHECKPOINT_MARKER_ICONS,
  DEFAULT_MARKER_ICON,
} from "@/lib/checkpoint-marker-icons"
import { type PublicMapData, loadPublicMap } from "@/lib/repos/publicMapRepo"
import { checkpointPhotoThumbUrl } from "@/lib/repos/trailTypes"
import { getSupabase } from "@/lib/supabase/client"
import type {
  EventCourse,
  EventCourseCheckpoint,
} from "@/lib/repos/trackerControlTypes"

/** 포인트 마커 아이콘 (지도 마커와 동일) */
function PointIcon({ name, size = 16 }: { name: string | null; size?: number }) {
  const icon = CHECKPOINT_MARKER_ICONS[name ?? ""] ?? DEFAULT_MARKER_ICON
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={icon.color}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {icon.paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  )
}

/** 포인트 기록 상세 — 앱의 체크포인트 상세처럼 설명 + 사진 슬라이드 */
function PointDetailDialog({
  point,
  onClose,
}: {
  point: EventCourseCheckpoint | null
  onClose: () => void
}) {
  const [photos, setPhotos] = useState<string[] | null>(null)

  useEffect(() => {
    if (!point?.id) {
      setPhotos([])
      return
    }
    setPhotos(null)
    let cancelled = false
    getSupabase()
      .from("trail_checkpoint_photos")
      .select("storage_bucket, storage_path")
      .eq("checkpoint_id", point.id)
      .order("created_at")
      .then(({ data }) => {
        if (cancelled) return
        setPhotos(
          ((data ?? []) as { storage_bucket: string; storage_path: string }[]).map(
            (r) => checkpointPhotoThumbUrl(r, 1200),
          ),
        )
      })
    return () => {
      cancelled = true
    }
  }, [point?.id])

  return (
    <Dialog open={!!point} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full border bg-white shadow-sm">
              <PointIcon name={point?.marker_icon ?? null} />
            </span>
            {point?.title}
          </DialogTitle>
        </DialogHeader>

        {point?.note && (
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {point.note}
          </p>
        )}

        {photos === null ? (
          <div className="flex aspect-video items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">
            사진 불러오는 중…
          </div>
        ) : photos.length === 0 ? (
          <div className="flex aspect-video items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">
            아직 등록된 사진이 없어요
          </div>
        ) : (
          <Carousel className="w-full">
            <CarouselContent>
              {photos.map((url, i) => (
                <CarouselItem key={url}>
                  <div className="overflow-hidden rounded-xl bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`${point?.title} 사진 ${i + 1}`}
                      className="aspect-[4/3] w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {photos.length > 1 && (
              <>
                <CarouselPrevious className="left-2" />
                <CarouselNext className="right-2" />
              </>
            )}
          </Carousel>
        )}
        {photos != null && photos.length > 1 && (
          <p className="text-center text-xs text-muted-foreground">
            사진 {photos.length}장 — 좌우로 넘겨보세요
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** 공개 지도 공유 페이지 — 완료(published)한 지도는 링크로 누구나 조회 가능.
 *  (앱 공개/비공개는 앱 노출만 제어 — 링크 조회와 무관. 작성중은 조회 불가)
 *  로그인 불필요 (/m 은 middleware matcher 밖). */
export default function PublicMapPage() {
  const params = useParams<{ id: string }>()
  const [data, setData] = useState<PublicMapData | null | undefined>(undefined)
  const [is3d, setIs3d] = useState(true)
  const [selectedPoint, setSelectedPoint] =
    useState<EventCourseCheckpoint | null>(null)

  useEffect(() => {
    let cancelled = false
    loadPublicMap(params.id)
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch(() => {
        if (!cancelled) setData(null)
      })
    return () => {
      cancelled = true
    }
  }, [params.id])

  const points = useMemo(() => data?.points ?? [], [data])

  // LiveMap 용 코스 — 스탬프지도(경로 없음)는 포인트 범위로 bounds 를 만들어 fit
  const course: EventCourse | null = useMemo(() => {
    if (!data) return null
    let bounds = data.bounds
    if (!bounds && points.length > 0) {
      bounds = {
        minLat: Math.min(...points.map((p) => p.lat)),
        maxLat: Math.max(...points.map((p) => p.lat)),
        minLon: Math.min(...points.map((p) => p.lng)),
        maxLon: Math.max(...points.map((p) => p.lng)),
      }
    }
    return {
      name: data.name,
      distance_km: data.distance_km,
      bounds,
      center: data.center,
      coordinates: data.coordinates,
      checkpoints: points,
    }
  }, [data, points])

  function copyLink() {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => toast.success("지도 링크를 복사했어요."))
      .catch(() => toast.error("복사에 실패했어요."))
  }

  if (data === undefined) {
    return (
      <main className="theme-light flex min-h-[100dvh] items-center justify-center bg-background text-sm text-muted-foreground">
        불러오는 중…
      </main>
    )
  }

  if (!data) {
    return (
      <main className="theme-light flex min-h-[100dvh] flex-col items-center justify-center bg-background px-6 text-center text-foreground">
        <h1 className="text-lg font-bold">아직 완성되지 않았거나 없는 지도예요</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          링크를 다시 확인해 주세요.
        </p>
      </main>
    )
  }

  const isStamp = data.map_type === "stamp"

  return (
    <main className="theme-light flex min-h-[100dvh] flex-col bg-background text-foreground">
      <div className="mx-auto w-full max-w-screen-xl px-4 py-8">
        {/* 헤더 */}
        <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold tracking-widest text-muted-foreground">
              HILLY HEALLY MAP
            </p>
            <h1 className="flex items-center gap-2 text-2xl font-extrabold leading-tight">
              {data.name}
              <Badge variant="secondary">
                {isStamp ? (
                  <>
                    <Stamp className="mr-1 h-3 w-3" />
                    스탬프지도
                  </>
                ) : (
                  <>
                    <Route className="mr-1 h-3 w-3" />
                    코스지도
                  </>
                )}
              </Badge>
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
              {data.distance_km != null && (
                <span className="tabular-nums">
                  {data.distance_km.toFixed(1)}km
                </span>
              )}
              {data.total_ascent_m != null && (
                <span className="flex items-center gap-1 tabular-nums">
                  <Mountain className="h-3.5 w-3.5" />
                  D+{Math.round(data.total_ascent_m)}m
                </span>
              )}
              {points.length > 0 && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  포인트 {points.length}개
                </span>
              )}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={copyLink}>
            <Link2 className="mr-1.5 h-4 w-4" />
            링크 복사
          </Button>
        </header>

        {/* 지도 */}
        <div className="relative h-[55dvh] min-h-[360px] overflow-hidden rounded-2xl border">
          <LiveMap
            bare
            course={course}
            entries={[]}
            tails={[]}
            categories={[]}
            enable3d={is3d}
            onCheckpointSelect={setSelectedPoint}
            height="100%"
            className="absolute inset-0"
          />
          <MapDimensionToggle
            is3d={is3d}
            onChange={setIs3d}
            className="absolute bottom-3 left-3 z-10"
          />
        </div>

      </div>

      {/* 앱으로 보기 — 페이지 최하단 고정 푸터 */}
      <footer className="mt-auto border-t bg-background">
        <div className="mx-auto flex w-full max-w-screen-xl flex-col items-center gap-2 px-4 py-6">
          <Button
            size="lg"
            className="bg-[#DC2F55] px-8 text-white hover:bg-[#DC2F55]/90"
            onClick={() =>
              attemptOpenApp(
                `t/${params.id}`,
                detectPlatform(navigator.userAgent),
              )
            }
          >
            <Smartphone className="mr-2 h-5 w-5" />
            힐리힐리 앱으로 보기
          </Button>
          <p className="text-xs text-muted-foreground">
            이 지도로 모험을 시작해 보세요 · 앱이 없으면{" "}
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              App Store
            </a>
            {" / "}
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              Google Play
            </a>
          </p>
        </div>
      </footer>

      <PointDetailDialog
        point={selectedPoint}
        onClose={() => setSelectedPoint(null)}
      />
    </main>
  )
}
