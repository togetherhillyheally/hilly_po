"use client"

import { useEffect, useRef } from "react"
import type { AdCampaign } from "@/lib/repos/broadcastTypes"

/**
 * 광고 카드 — "광고" 라벨 상시 표기(표시광고법). 절반 이상 보이면 노출 1회, 누르면 클릭 기록 후 새 탭.
 * variant: banner(시트 머리, 3:1) / inline(채팅 사이, 작게) / wide(종료 배너 아래)
 */
export default function AdCard({
  ad,
  variant = "banner",
  onImpression,
  onClick,
  className,
}: {
  ad: AdCampaign
  variant?: "banner" | "inline" | "wide"
  onImpression: (ad: AdCampaign) => void
  onClick: (ad: AdCampaign) => void
  className?: string
}) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === "undefined") return
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting && e.intersectionRatio >= 0.5)) {
          onImpression(ad)
          io.disconnect()
        }
      },
      { threshold: [0.5] },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [ad, onImpression])

  const open = () => {
    onClick(ad)
    if (ad.link_url) window.open(ad.link_url, "_blank", "noopener,noreferrer")
  }

  // 폰 시트 머리는 낮게(4:1) — 살짝 열린 시트에서 채팅을 가리지 않게. 데스크톱 카드는 3:1
  const aspect =
    variant === "inline" ? "aspect-[4/1]" : variant === "wide" ? "aspect-[4/1]" : "aspect-[4/1] md:aspect-[3/1]"

  return (
    <aside
      ref={ref}
      aria-label={`광고 · ${ad.advertiser ?? ad.name}`}
      className={
        "relative overflow-hidden rounded-xl border bg-muted " +
        (variant === "inline" ? "mx-3 my-1.5 " : "") +
        (className ?? "")
      }
    >
      <button
        type="button"
        onClick={open}
        disabled={!ad.link_url}
        className={"block w-full " + aspect + " disabled:cursor-default"}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ad.image_url} alt={ad.alt_text ?? ad.name} className="h-full w-full object-cover" loading="lazy" />
      </button>
      <span className="pointer-events-none absolute left-1.5 top-1.5 rounded bg-black/55 px-1.5 py-px text-[9px] font-bold tracking-wide text-white">
        광고
      </span>
      {ad.advertiser && (
        <span className="pointer-events-none absolute bottom-1.5 right-1.5 max-w-[60%] truncate rounded bg-black/45 px-1.5 py-px text-[10px] text-white">
          {ad.advertiser}
        </span>
      )}
    </aside>
  )
}
