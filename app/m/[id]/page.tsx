"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import { Link2, MapPin, Mountain, Route, Stamp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapDimensionToggle } from "@/components/control/DisplayFilter"
import ElevationProfile from "@/components/control/ElevationProfile"
import LiveMap from "@/components/control/LiveMap"
import { buildCourseIndex } from "@/lib/course-progress"
import { type PublicMap, loadPublicMap } from "@/lib/repos/publicMapRepo"
import type { EventCourse } from "@/lib/repos/trackerControlTypes"

/** 공개 지도 공유 페이지 — 완료+공개(published+public)된 지도만 표시 (RLS 보장).
 *  로그인 불필요 (/m 은 middleware matcher 밖). */
export default function PublicMapPage() {
  const params = useParams<{ id: string }>()
  const [data, setData] = useState<PublicMap | null | undefined>(undefined)
  const [is3d, setIs3d] = useState(true)

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

  const trail = data?.trail ?? null
  const points = useMemo(() => data?.points ?? [], [data])

  const courseIndex = useMemo(
    () => (trail?.coordinates ? buildCourseIndex(trail.coordinates) : null),
    [trail],
  )

  // LiveMap 용 코스 — 스탬프지도(경로 없음)는 포인트 범위로 bounds 를 만들어 fit
  const course: EventCourse | null = useMemo(() => {
    if (!trail) return null
    let bounds = trail.bounds
    if (!bounds && points.length > 0) {
      bounds = {
        minLat: Math.min(...points.map((p) => p.lat)),
        maxLat: Math.max(...points.map((p) => p.lat)),
        minLon: Math.min(...points.map((p) => p.lng)),
        maxLon: Math.max(...points.map((p) => p.lng)),
      }
    }
    return {
      name: trail.name,
      distance_km: trail.distance_km,
      bounds,
      center: trail.center,
      coordinates: trail.coordinates,
      checkpoints: points,
    }
  }, [trail, points])

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

  if (!trail) {
    return (
      <main className="theme-light flex min-h-[100dvh] flex-col items-center justify-center bg-background px-6 text-center text-foreground">
        <h1 className="text-lg font-bold">비공개이거나 없는 지도예요</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          링크를 다시 확인해 주세요.
        </p>
      </main>
    )
  }

  const isStamp = trail.map_type === "stamp"

  return (
    <main className="theme-light min-h-[100dvh] bg-background text-foreground">
      <div className="mx-auto w-full max-w-screen-xl px-4 py-8">
        {/* 헤더 */}
        <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold tracking-widest text-muted-foreground">
              HILLY HEALLY MAP
            </p>
            <h1 className="flex items-center gap-2 text-2xl font-extrabold leading-tight">
              {trail.name}
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
              {trail.distance_km != null && (
                <span className="tabular-nums">
                  {trail.distance_km.toFixed(1)}km
                </span>
              )}
              {courseIndex?.totalAscentM != null && (
                <span className="flex items-center gap-1 tabular-nums">
                  <Mountain className="h-3.5 w-3.5" />
                  D+{courseIndex.totalAscentM}m
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
            height="100%"
            className="absolute inset-0"
          />
          <MapDimensionToggle
            is3d={is3d}
            onChange={setIs3d}
            className="absolute bottom-3 left-3 z-10"
          />
        </div>

        {/* 고도 프로필 (경로 지도만) */}
        {courseIndex && (
          <div className="mt-4 overflow-hidden rounded-2xl bg-background">
            <ElevationProfile
              index={courseIndex}
              entries={[]}
              categories={[]}
              checkpoints={points}
              expanded
              className="h-[32dvh] min-h-[240px]"
            />
          </div>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          힐리힐리 앱에서 이 지도로 모험을 시작해 보세요 🏔️
        </p>
      </div>
    </main>
  )
}
