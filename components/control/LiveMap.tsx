"use client"

import { useEffect, useRef } from "react"
import mapboxgl, { type LngLatBoundsLike } from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import {
  CHECKPOINT_MARKER_ICONS,
  DEFAULT_MARKER_ICON,
} from "@/lib/checkpoint-marker-icons"
import { applyKoreanLabels } from "@/lib/mapbox-locale"
import type { RankedEntry } from "@/lib/course-progress"
import type { EventCourse, TailPoint } from "@/lib/repos/trackerControlTypes"

const MAPBOX_STYLE = "mapbox://styles/mapbox/outdoors-v12"
const TRAIL_COLOR = "#DC2F55"
const DEFAULT_CENTER: [number, number] = [127.8, 36.3] // 코스 없을 때 한국 중심
const CATEGORY_COLORS = [
  "#3b82f6",
  "#f59e0b",
  "#10b981",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
]

/** 구분(카테고리)별 색 — 구분 없는 엔트리는 첫 색 */
export function categoryColor(
  category: string | null,
  categories: string[],
): string {
  if (!category) return CATEGORY_COLORS[0]
  const idx = categories.indexOf(category)
  return CATEGORY_COLORS[(idx < 0 ? 0 : idx) % CATEGORY_COLORS.length]
}

export type LiveMapProps = {
  course: EventCourse | null
  entries: RankedEntry[]
  tails: TailPoint[]
  /** 이벤트의 전체 구분 목록 (색 배정 기준) */
  categories: string[]
  selectedId?: string | null
  onSelect?: (entryId: string) => void
  /** 값이 바뀔 때마다 선택된 참가자로 flyTo (같은 참가자 재클릭 포커스용 카운터) */
  focusSignal?: number
  /** 3D 지형(terrain) 표시 여부 */
  enable3d?: boolean
  /** 지형(DEM) 기반 참가자별 해발고도(m) 보고 — 코스 고도가 없는 모니터 모드 보조용 */
  onElevations?: (elevations: Map<string, number>) => void
  className?: string
  height?: number | string
  /** true 면 라운드/테두리 없이 컨테이너를 꽉 채움 (전체 화면 배치용) */
  bare?: boolean
}

const DEM_SOURCE = "mapbox-dem"
const TERRAIN_PITCH = 55

function ensureDemSource(map: mapboxgl.Map) {
  if (!map.getSource(DEM_SOURCE)) {
    map.addSource(DEM_SOURCE, {
      type: "raster-dem",
      url: "mapbox://mapbox.mapbox-terrain-dem-v1",
      tileSize: 512,
      maxzoom: 14,
    })
  }
}

function markerLabel(r: RankedEntry): string {
  const flag = r.finished ? "✓ " : ""
  const rank = r.rank != null && r.rank <= 3 ? `${r.rank}위 ` : ""
  const bib = r.entry.bib_no ? `#${r.entry.bib_no} ` : ""
  return `${flag}${rank}${bib}${r.entry.display_name}`
}

/** 겹침 대비 z-index: 선택 > SOS > 순위 높은 순. 호버 시 일시적으로 최상단 */
function markerZIndex(r: RankedEntry, selected: boolean): string {
  if (selected) return "1000"
  if (r.status === "sos") return "900"
  if (r.rank != null) return String(600 - Math.min(r.rank, 500))
  return "100"
}

/** Mapbox 가 붙인 마커 클래스를 건드리지 않도록 외부 el 안에 chip div 를 두고 그것만 스타일링 */
function styleMarkerEl(
  el: HTMLElement,
  r: RankedEntry,
  color: string,
  selected: boolean,
) {
  let chip = el.firstElementChild as HTMLDivElement | null
  if (!chip) {
    chip = document.createElement("div")
    el.appendChild(chip)
  }
  chip.textContent = markerLabel(r)
  // 도착자는 신호가 끊겨도 정상 표시 유지
  const noSignal =
    (r.status === "stale" || r.status === "noSignal") && !r.finished
  const podium = r.rank != null && r.rank <= 3
  chip.className =
    "inline-flex w-max items-center rounded-full border border-white/80 px-2 py-0.5 text-[11px] font-bold text-white shadow-md cursor-pointer select-none whitespace-nowrap" +
    (r.status === "sos" ? " animate-pulse ring-2 ring-red-500" : "") +
    // 신호 없음: 빨간 링 + 살짝 흐리게 (SOS 의 빨간 배경/펄스와 구분)
    (noSignal ? " opacity-75 ring-2 ring-red-500" : "") +
    // 1~3위: 색 구분 없이 살짝 크게 ("n위" 텍스트로만 표시)
    (podium ? " text-[12px]" : "") +
    (selected ? " ring-2 ring-white scale-110" : "")
  chip.style.background = r.status === "sos" ? "#dc2626" : color

  const z = markerZIndex(r, selected)
  el.dataset.z = z
  el.style.zIndex = z
}

export default function LiveMap({
  course,
  entries,
  tails,
  categories,
  selectedId,
  onSelect,
  focusSignal = 0,
  enable3d = false,
  onElevations,
  className,
  height = 520,
  bare = false,
}: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map())
  const cpMarkersRef = useRef<mapboxgl.Marker[]>([])
  const didFitToEntriesRef = useRef(false)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const enable3dRef = useRef(enable3d)
  enable3dRef.current = enable3d
  const onElevationsRef = useRef(onElevations)
  onElevationsRef.current = onElevations

  // 지도 초기화 — 코스가 있으면 코스 기준, 없으면 참가자 위치에 맞춰 이후 fit
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!containerRef.current || !token) return
    mapboxgl.accessToken = token

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_STYLE,
      center: course?.center ?? DEFAULT_CENTER,
      zoom: course ? 11 : 6,
      attributionControl: false,
    })
    mapRef.current = map
    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-right",
    )

    map.on("load", () => {
      applyKoreanLabels(map)

      // 코스 라인
      if (course?.coordinates) {
        const coords = course.coordinates
        const isMulti =
          coords.length > 0 && Array.isArray((coords[0] as unknown[])[0])
        const geometry = isMulti
          ? {
              type: "MultiLineString" as const,
              coordinates: (coords as [number, number, number?][][]).map(
                (seg) => seg.map(([lng, lat]) => [lng, lat]),
              ),
            }
          : {
              type: "LineString" as const,
              coordinates: (coords as [number, number, number?][]).map(
                ([lng, lat]) => [lng, lat],
              ),
            }
        map.addSource("course", {
          type: "geojson",
          data: { type: "Feature", properties: {}, geometry },
        })
        map.addLayer({
          id: "course-line",
          type: "line",
          source: "course",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": TRAIL_COLOR,
            "line-width": 3,
            "line-opacity": 0.8,
          },
        })
      }

      // 이동 궤적(꼬리) — setData 로 갱신
      map.addSource("tails", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      })
      map.addLayer({
        id: "tails-line",
        type: "line",
        source: "tails",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          // 라이트 톤 지도에서 보이도록 어두운 슬레이트 계열
          "line-color": "#475569",
          "line-width": 2,
          "line-opacity": 0.45,
        },
      })

      // 체크포인트 마커 — 에디터 기본지도와 동일하게 마커 아이콘으로 표시
      for (const cp of course?.checkpoints ?? []) {
        const icon =
          CHECKPOINT_MARKER_ICONS[cp.marker_icon ?? ""] ?? DEFAULT_MARKER_ICON
        const el = document.createElement("div")
        el.className =
          "flex h-6 w-6 items-center justify-center rounded-full border border-black/10 bg-white shadow"
        el.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="${icon.color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${icon.paths
          .map((d) => `<path d="${d}"/>`)
          .join("")}</svg>`
        el.title = cp.title
        cpMarkersRef.current.push(
          new mapboxgl.Marker(el).setLngLat([cp.lng, cp.lat]).addTo(map),
        )
      }

      if (course?.bounds) {
        const fb: LngLatBoundsLike = [
          [course.bounds.minLon, course.bounds.minLat],
          [course.bounds.maxLon, course.bounds.maxLat],
        ]
        map.fitBounds(fb, { padding: 60, animate: false })
      }

      // 3D 지형 초기 적용
      ensureDemSource(map)
      if (enable3dRef.current) {
        map.setTerrain({ source: DEM_SOURCE, exaggeration: 1.3 })
        map.easeTo({ pitch: TERRAIN_PITCH, duration: 800 })
      }
    })

    return () => {
      map.remove()
      mapRef.current = null
      markersRef.current.clear()
      cpMarkersRef.current = []
      didFitToEntriesRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course])

  // 참가자 마커 동기화 (entry_id 기준 diff — 위치/스타일만 갱신)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const apply = () => {
      const seen = new Set<string>()
      for (const r of entries) {
        if (r.entry.lat == null || r.entry.lng == null) continue
        seen.add(r.entry.entry_id)
        const color = categoryColor(r.entry.category, categories)
        const existing = markersRef.current.get(r.entry.entry_id)
        if (existing) {
          existing.setLngLat([r.entry.lng, r.entry.lat])
          styleMarkerEl(
            existing.getElement() as HTMLDivElement,
            r,
            color,
            selectedId === r.entry.entry_id,
          )
        } else {
          const el = document.createElement("div")
          styleMarkerEl(el, r, color, selectedId === r.entry.entry_id)
          el.addEventListener("click", (ev) => {
            ev.stopPropagation()
            onSelectRef.current?.(r.entry.entry_id)
          })
          // 겹친 마커 위에 호버하면 일시적으로 최상단
          el.addEventListener("mouseenter", () => {
            el.style.zIndex = "1500"
          })
          el.addEventListener("mouseleave", () => {
            el.style.zIndex = el.dataset.z ?? ""
          })
          markersRef.current.set(
            r.entry.entry_id,
            new mapboxgl.Marker(el).setLngLat([r.entry.lng, r.entry.lat]).addTo(map),
          )
        }
      }
      for (const [id, marker] of markersRef.current) {
        if (!seen.has(id)) {
          marker.remove()
          markersRef.current.delete(id)
        }
      }

      // 지형(DEM) 기반 참가자 해발고도 보고 — 타일 로드 전엔 null 이라 다음 폴링에서 채워짐
      if (onElevationsRef.current && map.getTerrain()) {
        const elevations = new Map<string, number>()
        for (const r of entries) {
          if (r.entry.lat == null || r.entry.lng == null) continue
          const e = map.queryTerrainElevation([r.entry.lng, r.entry.lat], {
            exaggerated: false,
          })
          if (e != null) elevations.set(r.entry.entry_id, e)
        }
        onElevationsRef.current(elevations)
      }

      // 코스가 없으면(모니터 모드) 첫 위치 수신 때 한 번 참가자 범위로 fit
      if (!course && !didFitToEntriesRef.current && seen.size > 0) {
        didFitToEntriesRef.current = true
        const b = new mapboxgl.LngLatBounds()
        for (const r of entries) {
          if (r.entry.lat != null && r.entry.lng != null) {
            b.extend([r.entry.lng, r.entry.lat])
          }
        }
        map.fitBounds(b, { padding: 80, maxZoom: 14, animate: false })
      }
    }

    if (map.loaded()) apply()
    else map.once("load", apply)
  }, [entries, categories, selectedId, course])

  // 2D/3D 전환
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const apply = () => {
      if (enable3d) {
        ensureDemSource(map)
        map.setTerrain({ source: DEM_SOURCE, exaggeration: 1.3 })
        map.easeTo({ pitch: TERRAIN_PITCH, duration: 800 })
      } else {
        map.setTerrain(null)
        map.easeTo({ pitch: 0, bearing: 0, duration: 800 })
      }
    }
    if (map.loaded()) apply()
    else map.once("load", apply)
  }, [enable3d])

  // 선택된 참가자로 이동 — focusSignal 로 같은 참가자 재클릭도 다시 포커스
  useEffect(() => {
    const map = mapRef.current
    if (!map || !selectedId) return
    const r = entries.find((e) => e.entry.entry_id === selectedId)
    if (r && r.entry.lat != null && r.entry.lng != null) {
      map.flyTo({
        center: [r.entry.lng, r.entry.lat],
        zoom: Math.max(map.getZoom(), 14),
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, focusSignal])

  // 꼬리 갱신
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const apply = () => {
      const source = map.getSource("tails") as mapboxgl.GeoJSONSource | undefined
      if (!source) return
      const byEntry = new Map<string, [number, number][]>()
      for (const t of tails) {
        const list = byEntry.get(t.entry_id) ?? []
        list.push([t.lng, t.lat])
        byEntry.set(t.entry_id, list)
      }
      source.setData({
        type: "FeatureCollection",
        features: Array.from(byEntry.values())
          .filter((coords) => coords.length >= 2)
          .map((coords) => ({
            type: "Feature" as const,
            properties: {},
            geometry: { type: "LineString" as const, coordinates: coords },
          })),
      })
    }
    if (map.loaded()) apply()
    else map.once("load", apply)
  }, [tails])

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  if (!token) {
    return (
      <div
        className={
          "rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center text-sm text-gray-500 " +
          (className ?? "")
        }
        style={{ height }}
      >
        Mapbox 토큰이 설정되지 않았어요.
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={
        // isolate: 마커의 z-index 가 지도 밖(사이드바 등)을 덮지 않도록 스태킹 컨텍스트 격리
        (bare
          ? "isolate overflow-hidden "
          : "isolate overflow-hidden rounded-xl border border-white/10 ") +
        (className ?? "")
      }
      style={{ height, width: "100%" }}
    />
  )
}
