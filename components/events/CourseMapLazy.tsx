"use client"

import dynamic from "next/dynamic"

// mapbox-gl(~500kB)은 지도 영역이 필요할 때만 받아와요.
const CourseMap = dynamic(
  () => import("./CourseMap").then((m) => m.CourseMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full animate-pulse bg-muted" />
    ),
  }
)

export function CourseMapLazy({ className }: { className?: string }) {
  return <CourseMap className={className} />
}
