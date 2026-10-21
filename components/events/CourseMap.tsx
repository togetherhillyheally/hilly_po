"use client"

import { useEffect, useRef } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import { applyKoreanLabels } from "@/lib/mapbox-locale"
import { CPS, START, TIER_COLOR, type CheckPoint } from "@/lib/events/gwanggyo-cps"
import { NATSEONGOT } from "@/lib/events"

const COURSE_TRAIL_ID = NATSEONGOT.courseTrailId

function markerEl(cp: CheckPoint): HTMLDivElement {
  // 스탬프(도장) 스타일 — 배점 숫자 + 톱니 테두리 느낌의 점선 링.
  // 바깥 el 의 transform 은 Mapbox 가 위치 지정에 쓰므로 절대 건드리지 않고,
  // 디자인·호버 효과는 안쪽 chip 에만 건다 (transition 이 밖에 있으면 지도 팬 시 마커가 뒤따라옴).
  const color = TIER_COLOR[cp.points]
  const el = document.createElement("div")
  const chip = document.createElement("div")
  chip.style.cssText = `
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
  chip.textContent = String(cp.points)
  chip.addEventListener(
    "mouseenter",
    () => (chip.style.transform = "scale(1.2)")
  )
  chip.addEventListener("mouseleave", () => (chip.style.transform = "scale(1)"))
  el.appendChild(chip)
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

/** DB(스탬프지도) 포인트 → 체크포인트. 제목 끝 "(배점)" 규약 — 없으면 출발점으로 간주.
 *  event_course_points RPC 사용: 지도의 공개 설정(visibility)과 무관하게
 *  BO 에디터에서 저장한 최신 포인트가 그대로 반영된다. */
async function loadFromTrail(): Promise<{
  cps: CheckPoint[]
  start: { name: string; lng: number; lat: number } | null
} | null> {
  if (!COURSE_TRAIL_ID) return null
  try {
    const { getSupabase } = await import("@/lib/supabase/client")
    const { data, error } = await getSupabase().rpc("event_course_points", {
      p_trail_id: COURSE_TRAIL_ID,
    })
    if (error) return null
    const raw = (data ?? {}) as {
      points?: { title?: unknown; lat?: unknown; lng?: unknown }[]
    }
    const points = Array.isArray(raw.points) ? raw.points : []
    if (points.length === 0) return null
    const cps: CheckPoint[] = []
    let start: { name: string; lng: number; lat: number } | null = null
    for (const p of points) {
      const title = typeof p.title === "string" ? p.title : ""
      const lat = typeof p.lat === "number" ? p.lat : null
      const lng = typeof p.lng === "number" ? p.lng : null
      if (lat == null || lng == null) continue
      const m = title.match(/[(（]\s*(\d{1,3})\s*[)）]\s*$/)
      if (m) {
        const tier = Number(m[1]) as CheckPoint["points"]
        if (!(tier in TIER_COLOR)) continue
        cps.push({
          name: title.replace(/[(（]\s*\d{1,3}\s*[)）]\s*$/, "").trim(),
          points: tier,
          lng,
          lat,
        })
      } else if (!start) {
        start = { name: title, lng, lat }
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
      const markers: mapboxgl.Marker[] = []
      for (const cp of cps) {
        markers.push(
          new mapboxgl.Marker({ element: markerEl(cp) })
            .setLngLat([cp.lng, cp.lat])
            .setPopup(
              new mapboxgl.Popup({ offset: 14, closeButton: false }).setHTML(
                `<div style="font-size:12px;font-weight:700">${esc(cp.name)}</div>
                 <div style="font-size:12px;color:#666">${cp.points}점</div>`
              )
            )
            .addTo(m)
        )
      }

      if (start) {
        markers.push(
          new mapboxgl.Marker({ element: startEl(), anchor: "bottom" })
            .setLngLat([start.lng, start.lat])
            .addTo(m)
        )
      }

      // 초기 레이아웃이 안정되기 전에 추가된 마커가 낡은 투영값으로
      // 모서리에 찍히는 문제 — 로드/유휴 시점에 위치를 강제 재계산
      const reproject = () => {
        m.resize()
        for (const mk of markers) mk.setLngLat(mk.getLngLat())
      }
      m.once("load", reproject)
      m.once("idle", reproject)
      const lateFix = setTimeout(reproject, 1200)
      m.once("remove", () => clearTimeout(lateFix))
    })

    return () => {
      cancelled = true
      map.current?.remove()
      map.current = null
    }
  }, [])

  return <div ref={box} className={className} />
}
