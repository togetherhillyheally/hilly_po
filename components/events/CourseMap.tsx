"use client"

import { useEffect, useRef } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import { applyKoreanLabels } from "@/lib/mapbox-locale"
import { CPS, START, TIER_COLOR, type CheckPoint } from "@/lib/events/gwanggyo-cps"

function markerEl(cp: CheckPoint): HTMLDivElement {
  const el = document.createElement("div")
  el.style.cssText = `
    width: 24px; height: 24px; border-radius: 50%;
    background: ${TIER_COLOR[cp.points]};
    border: 2px solid #fff;
    box-shadow: 0 1px 4px rgba(0,0,0,.35);
    cursor: pointer;
  `
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

export function CourseMap({ className }: { className?: string }) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!box.current || map.current || !token) return

    mapboxgl.accessToken = token

    const pts: [number, number][] = [
      ...CPS.map((c) => [c.lng, c.lat] as [number, number]),
      ...(START ? [[START.lng, START.lat] as [number, number]] : []),
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

    m.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right")
    m.on("style.load", () => applyKoreanLabels(m))

    for (const cp of CPS) {
      new mapboxgl.Marker({ element: markerEl(cp) })
        .setLngLat([cp.lng, cp.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 14, closeButton: false }).setHTML(
            `<div style="font-size:12px;font-weight:700">${cp.name}</div>
             <div style="font-size:12px;color:#666">${cp.points}점</div>`
          )
        )
        .addTo(m)
    }

    if (START) {
      new mapboxgl.Marker({ element: startEl(), anchor: "bottom" })
        .setLngLat([START.lng, START.lat])
        .addTo(m)
    }

    return () => {
      m.remove()
      map.current = null
    }
  }, [])

  return <div ref={box} className={className} />
}
