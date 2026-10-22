"use client"

import { useEffect, useRef } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import { applyKoreanLabels } from "@/lib/mapbox-locale"
import { START, TIER_COLOR, type CheckPoint } from "@/lib/events/gwanggyo-cps"
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

/** DB(스탬프지도) 포인트 → 체크포인트. 제목 끝 "(배점)" 규약.
 *  event_course_points RPC 사용: 지도의 공개 설정(visibility)과 무관하게
 *  BO 에디터에서 저장한 최신 포인트가 그대로 반영된다.
 *  START 는 trails.start_lat/lng(BO 상세의 "출발 · 도착" UI) 가 있으면 그걸
 *  쓰고, 없으면 "(배점)" 없는 레거시 stamp_point 를 START 로 폴백한다. */
type CourseData = {
  revealed: boolean
  revealAt: string | null
  cps: CheckPoint[]
  start: { name: string; lng: number; lat: number } | null
}

async function loadFromTrail(): Promise<CourseData | null> {
  if (!COURSE_TRAIL_ID) return null
  try {
    const { getSupabase } = await import("@/lib/supabase/client")
    const { data, error } = await getSupabase().rpc("event_course_points", {
      p_trail_id: COURSE_TRAIL_ID,
    })
    if (error) return null
    const raw = (data ?? {}) as {
      revealed?: unknown
      reveal_at?: unknown
      points?: { title?: unknown; lat?: unknown; lng?: unknown }[]
      start_lat?: unknown
      start_lng?: unknown
    }
    const revealed = raw.revealed !== false
    const revealAt = typeof raw.reveal_at === "string" ? raw.reveal_at : null
    const points = Array.isArray(raw.points) ? raw.points : []
    const cps: CheckPoint[] = []
    let legacyStart: { name: string; lng: number; lat: number } | null = null
    for (const p of points) {
      const rawTitle = typeof p.title === "string" ? p.title : ""
      const lat = typeof p.lat === "number" ? p.lat : null
      const lng = typeof p.lng === "number" ? p.lng : null
      if (lat == null || lng == null) continue
      // BO(hilly_home 어드민) 저장 규약: "아이콘|이름(배점)" — 아이콘 접두사는 표시명에서 제거
      const title = rawTitle.includes("|")
        ? rawTitle.slice(rawTitle.lastIndexOf("|") + 1).trim()
        : rawTitle
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
      } else if (!legacyStart) {
        legacyStart = { name: title, lng, lat }
      }
    }
    // 우선순위: trails.start_lat/lng → 레거시 "(배점) 없는" 포인트
    const sLat = typeof raw.start_lat === "number" ? raw.start_lat : null
    const sLng = typeof raw.start_lng === "number" ? raw.start_lng : null
    const start =
      sLat != null && sLng != null
        ? { name: "출발", lat: sLat, lng: sLng }
        : legacyStart
    return { revealed: revealed && cps.length > 0, revealAt, cps, start }
  } catch {
    return null // 네트워크/RPC 실패 — 티저(비공개) 지도로 폴백
  }
}

/** 공개 전 티저 — 작전 구역 원(대략 범위)만 표시, 체크포인트 위치는 숨김 */
function makeTeaserCircle(): GeoJSON.Feature<GeoJSON.Polygon> {
  const [cx, cy] = [127.0245, 37.3325]
  const rKm = 2.4
  const coords: [number, number][] = []
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2
    coords.push([
      cx + (rKm / (111.32 * Math.cos((cy * Math.PI) / 180))) * Math.cos(a),
      cy + (rKm / 110.57) * Math.sin(a),
    ])
  }
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [coords] },
  }
}

function formatRevealAt(iso: string | null): string {
  if (!iso) return "행사 시작 후"
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getMonth() + 1}. ${d.getDate()}. ${pad(d.getHours())}:${pad(d.getMinutes())}`
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
      // 공개 여부는 서버가 결정 — 비공개면 체크포인트 없이 티저만
      const revealed = db?.revealed === true
      const cps = revealed ? db!.cps : []
      const start = db?.start ?? START

      const pts: [number, number][] = [
        ...cps.map((c) => [c.lng, c.lat] as [number, number]),
        ...(start ? [[start.lng, start.lat] as [number, number]] : []),
      ]

      const m = new mapboxgl.Map({
        container: box.current,
        style: "mapbox://styles/mapbox/outdoors-v12",
        ...(revealed && pts.length > 0
          ? {
              bounds: pts.reduce(
                (b, p) => b.extend(p),
                new mapboxgl.LngLatBounds(pts[0], pts[0])
              ),
              fitBoundsOptions: { padding: 56, maxZoom: 14 },
            }
          : { center: [127.0245, 37.3325] as [number, number], zoom: 12 }),
        cooperativeGestures: true,
        attributionControl: false,
      })
      map.current = m

      if (!revealed) {
        // 작전 구역 점선 원 + 공개 예고 오버레이
        m.on("load", () => {
          m.addSource("teaser-zone", {
            type: "geojson",
            data: makeTeaserCircle(),
          })
          m.addLayer({
            id: "teaser-zone-fill",
            type: "fill",
            source: "teaser-zone",
            paint: { "fill-color": "#DC2F55", "fill-opacity": 0.08 },
          })
          m.addLayer({
            id: "teaser-zone-line",
            type: "line",
            source: "teaser-zone",
            paint: {
              "line-color": "#DC2F55",
              "line-width": 2,
              "line-dasharray": [2, 2],
            },
          })
        })
        const overlay = document.createElement("div")
        overlay.style.cssText =
          "position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);" +
          "background:rgba(14,14,16,.88);color:#fff;border-radius:14px;" +
          "padding:16px 22px;text-align:center;z-index:5;pointer-events:none;" +
          "box-shadow:0 4px 24px rgba(0,0,0,.4);max-width:85%"
        overlay.innerHTML =
          '<div style="font-size:15px;font-weight:700">🔒 체크포인트 위치는 비공개</div>' +
          `<div style="font-size:12px;color:#bbb;margin-top:6px">${formatRevealAt(db?.revealAt ?? null)} 에 이 지도에서 공개돼요</div>`
        box.current.appendChild(overlay)
        m.once("remove", () => overlay.remove())
      }

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
