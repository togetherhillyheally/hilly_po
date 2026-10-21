"use client"

import { useEffect, useRef } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import { applyKoreanLabels } from "@/lib/mapbox-locale"
import { CPS, START, TIER_COLOR, type CheckPoint } from "@/lib/events/gwanggyo-cps"
import { NATSEONGOT } from "@/lib/events"

const COURSE_TRAIL_ID = NATSEONGOT.courseTrailId

function markerEl(cp: CheckPoint): HTMLDivElement {
  // 스탬프(도장) 스타일 — 배점 숫자 + 톱니 테두리 느낌의 점선 링
  const color = TIER_COLOR[cp.points]
  const el = document.createElement("div")
  el.style.cssText = `
    width: 30px; height: 30px; border-radius: 50%;
    background: ${color};
    border: 2px solid #fff;
    outline: 2px dashed ${color};
    outline-offset: 1.5px;
    box-shadow: 0 1px 5px rgba(0,0,0,.35);
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-size: 11px; font-weight: 800;
    font-variant-numeric: tabular-nums;
    transition: transform .15s;
  `
  el.textContent = String(cp.points)
  el.addEventListener("mouseenter", () => (el.style.transform = "scale(1.2)"))
  el.addEventListener("mouseleave", () => (el.style.transform = "scale(1)"))
  el.setAttribute("aria-label", `${cp.name} ${cp.points}점`)
  return el
}

function startEl(): HTMLDivElement {
  const el = document.createElement("div")
  el.textContent = "START"
  el.style.cssText = `
    padding: 4px 9px; border-radius: 6px;
    background: #111; color: #fff;
    font-size: 11px; font-weight: 800; letter-spacing: .04em;
    border: 2px solid #fff;
    box-shadow: 0 1px 5px rgba(0,0,0,.4);
    white-space: nowrap;
  `
  return el
}

/** DB(스탬프지도) 포인트 → 체크포인트. 제목 끝 "(배점)" 규약 — 없으면 출발점으로 간주 */
async function loadFromTrail(): Promise<{
  cps: CheckPoint[]
  start: { name: string; lng: number; lat: number } | null
} | null> {
  if (!COURSE_TRAIL_ID) return null
  try {
    const { loadPublicMap } = await import("@/lib/repos/publicMapRepo")
    const data = await loadPublicMap(COURSE_TRAIL_ID)
    if (!data || data.points.length === 0) return null
    const cps: CheckPoint[] = []
    let start: { name: string; lng: number; lat: number } | null = null
    for (const p of data.points) {
      const m = p.title.match(/[(（]\s*(\d{1,3})\s*[)）]\s*$/)
      if (m) {
        const tier = Number(m[1]) as CheckPoint["points"]
        if (!(tier in TIER_COLOR)) continue
        cps.push({
          name: p.title.replace(/[(（]\s*\d{1,3}\s*[)）]\s*$/, "").trim(),
          points: tier,
          lng: p.lng,
          lat: p.lat,
        })
      } else if (!start) {
        start = { name: p.title, lng: p.lng, lat: p.lat }
      }
    }
    return cps.length > 0 ? { cps, start } : null
  } catch {
    return null // 네트워크/RPC 실패 — 하드코딩 좌표로 폴백
  }
}

export function CourseMap({ className }: { className?: string }) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!box.current || map.current || !token) return

    mapboxgl.accessToken = token
    let cancelled = false

    loadFromTrail().then((db) => {
      if (cancelled || !box.current || map.current) return
      // DB 지도(에디터에서 수정 가능)가 우선, 실패 시 코드 내 근사 좌표
      const cps = db?.cps ?? CPS
      const start = db ? db.start : START

      const pts: [number, number][] = [
        ...cps.map((c) => [c.lng, c.lat] as [number, number]),
        ...(start ? [[start.lng, start.lat] as [number, number]] : []),
      ]
      if (pts.length === 0) return

      const bounds = pts.reduce(
        (b, p) => b.extend(p),
        new mapboxgl.LngLatBounds(pts[0], pts[0])
      )

      const m = new mapboxgl.Map({
        container: box.current,
        style: "mapbox://styles/mapbox/outdoors-v12",
        bounds,
        fitBoundsOptions: { padding: 56, maxZoom: 14 },
        cooperativeGestures: true,
        attributionControl: false,
      })
      map.current = m

      m.addControl(
        new mapboxgl.NavigationControl({ showCompass: false }),
        "top-right"
      )
      m.on("style.load", () => applyKoreanLabels(m))

      const esc = (s: string) =>
        s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      for (const cp of cps) {
        new mapboxgl.Marker({ element: markerEl(cp) })
          .setLngLat([cp.lng, cp.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 14, closeButton: false }).setHTML(
              `<div style="font-size:12px;font-weight:700">${esc(cp.name)}</div>
               <div style="font-size:12px;color:#666">${cp.points}점</div>`
            )
          )
          .addTo(m)
      }

      if (start) {
        new mapboxgl.Marker({ element: startEl(), anchor: "bottom" })
          .setLngLat([start.lng, start.lat])
          .addTo(m)
      }
    })

    return () => {
      cancelled = true
      map.current?.remove()
      map.current = null
    }
  }, [])

  return <div ref={box} className={className} />
}
