"use client"

import dynamic from "next/dynamic"

// mapbox-gl(~500kB)을 랜딩 초기 번들에서 분리 — 텍스트/CTA 먼저, 지도는 뒤에 페이드인
const HeroMap = dynamic(
  () => import("./HeroMap").then((m) => m.HeroMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full animate-pulse rounded-2xl border bg-muted" />
    ),
  }
)

export function HeroMapLazy({ className }: { className?: string }) {
  return (
    <div className={className}>
      <HeroMap className="h-full" />
    </div>
  )
}
