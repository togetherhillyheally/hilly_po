"use client"

import { useEffect, useRef, useState } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import { applyKoreanLabels } from "@/lib/mapbox-locale"

const BRAND = "#DC2F55"

// 북한산 우이동 → 백운대 방면 데모 코스 (손으로 그린 근사 라인)
const DEMO_COURSE: [number, number][] = [
  [127.0113, 37.6632],
  [127.0089, 37.6618],
  [127.0064, 37.6607],
  [127.0037, 37.6601],
  [127.0012, 37.6589],
  [126.9992, 37.6572],
  [126.9978, 37.6552],
  [126.9961, 37.6537],
  [126.9938, 37.6529],
  [126.9913, 37.6524],
  [126.9891, 37.6512],
  [126.9878, 37.6494],
  [126.9868, 37.6473],
]

const CHECKPOINTS: { at: number; label: string; radiusM?: number }[] = [
  { at: 0, label: "S" },
  { at: 5, label: "1", radiusM: 120 },
  { at: 9, label: "2" },
  { at: 12, label: "E" },
]

/** 중심 좌표와 반경(m)으로 원형 폴리곤 생성 */
function circlePolygon(
  [lng, lat]: [number, number],
  radiusM: number,
  steps = 64
): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = []
  const dLat = radiusM / 111_320
  const dLng = radiusM / (111_320 * Math.cos((lat * Math.PI) / 180))
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * Math.PI * 2
    coords.push([lng + dLng * Math.cos(theta), lat + dLat * Math.sin(theta)])
  }
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [coords] },
  }
}

function makeMarkerEl(label: string): HTMLDivElement {
  const el = document.createElement("div")
  const isSE = label === "S" || label === "E"
  el.style.cssText = `
    width: 26px; height: 26px; border-radius: 50%;
    background: ${isSE ? "#22c55e" : BRAND};
    color: #fff; display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 700;
    border: 2px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.35);
    user-select: none; pointer-events: none;
  `
  el.textContent = label
  return el
}

export function HeroMap({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!containerRef.current || !token) return
    mapboxgl.accessToken = token

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [126.999, 37.6555],
      zoom: 13.1,
      pitch: 54,
      bearing: -18,
      interactive: false,
      attributionControl: false,
    })

    let raf = 0
    map.on("load", () => {
      applyKoreanLabels(map)

      map.addSource("demo-course", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: DEMO_COURSE },
        },
      })
      map.addLayer({
        id: "demo-course-casing",
        type: "line",
        source: "demo-course",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#ffffff", "line-width": 6, "line-opacity": 0.5 },
      })
      map.addLayer({
        id: "demo-course-line",
        type: "line",
        source: "demo-course",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": BRAND, "line-width": 3.5 },
      })

      const withRadius = CHECKPOINTS.find((c) => c.radiusM)
      if (withRadius?.radiusM) {
        map.addSource("demo-radius", {
          type: "geojson",
          data: circlePolygon(DEMO_COURSE[withRadius.at], withRadius.radiusM),
        })
        map.addLayer({
          id: "demo-radius-fill",
          type: "fill",
          source: "demo-radius",
          paint: { "fill-color": BRAND, "fill-opacity": 0.14 },
        })
        map.addLayer({
          id: "demo-radius-line",
          type: "line",
          source: "demo-radius",
          paint: {
            "line-color": BRAND,
            "line-width": 1.5,
            "line-opacity": 0.55,
            "line-dasharray": [2, 2],
          },
        })
      }

      for (const cp of CHECKPOINTS) {
        new mapboxgl.Marker(makeMarkerEl(cp.label))
          .setLngLat(DEMO_COURSE[cp.at])
          .addTo(map)
      }

      setReady(true)

      // 살아있는 3D 지도임을 보여주는 아주 느린 회전 (reduced-motion 시 정지)
      if (!reduceMotion) {
        const rotate = () => {
          if (!document.hidden) map.setBearing(map.getBearing() + 0.008)
          raf = requestAnimationFrame(rotate)
        }
        raf = requestAnimationFrame(rotate)
      }
    })

    return () => {
      cancelAnimationFrame(raf)
      map.remove()
    }
  }, [])

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  if (!token) {
    return (
      <div
        className={
          "flex items-center justify-center rounded-2xl border bg-card text-sm text-muted-foreground " +
          (className ?? "")
        }
      >
        지도 미리보기를 불러올 수 없어요
      </div>
    )
  }

  return (
    <div
      className={
        "relative overflow-hidden rounded-2xl border " + (className ?? "")
      }
    >
      {!ready && <div className="absolute inset-0 animate-pulse bg-muted" />}
      <div
        ref={containerRef}
        className="h-full w-full transition-opacity duration-700"
        style={{ opacity: ready ? 1 : 0 }}
      />
      {/* 캔버스 위 은은한 비네트 — 다크 페이지와 지도 톤 연결 */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_0_0_60px_rgba(0,0,0,0.35)]" />
    </div>
  )
}
