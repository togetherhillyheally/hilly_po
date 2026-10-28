"use client"

import { useEffect, useRef } from "react"
import mapboxgl, { type LngLatBoundsLike } from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import {
  CHECKPOINT_MARKER_ICONS,
  DEFAULT_MARKER_ICON,
} from "@/lib/checkpoint-marker-icons"
import { toast } from "sonner"
import { haversineMeters } from "@/lib/geo"
import { applyKoreanLabels } from "@/lib/mapbox-locale"
import { TRAIL_SEGMENT_PALETTE } from "@/lib/trail-palette"
import {
  batteryPercentOf,
  isGpsWaiting,
  type RankedEntry,
  STATIONARY_THRESHOLD_SEC,
} from "@/lib/course-progress"
import type {
  EventCourse,
  EventCourseCheckpoint,
  TailPoint,
} from "@/lib/repos/trackerControlTypes"

export type MapStyleKey = "outdoors" | "streets" | "satellite"

const MAPBOX_STYLES: Record<MapStyleKey, string> = {
  outdoors: "mapbox://styles/mapbox/outdoors-v12",
  streets: "mapbox://styles/mapbox/streets-v12",
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
}

const TRAIL_COLOR = "#DC2F55"
const DEFAULT_CENTER: [number, number] = [127.8, 36.3] // 코스 없을 때 한국 중심
const ARROW_IMAGE = "course-arrow"

/** 코스 진행 방향 화살표 — 선 위에 놓이는 흰 꺾쇠(>). 오른쪽이 진행 방향 */
function courseArrowImage(): ImageData {
  const size = 48 // pixelRatio 2 → 24px
  const c = document.createElement("canvas")
  c.width = c.height = size
  const g = c.getContext("2d")!
  g.lineCap = "round"
  g.lineJoin = "round"
  const draw = (color: string, w: number) => {
    g.strokeStyle = color
    g.lineWidth = w
    g.beginPath()
    g.moveTo(18, 12)
    g.lineTo(30, 24)
    g.lineTo(18, 36)
    g.stroke()
  }
  draw(TRAIL_COLOR, 12) // 테두리 — 지도 위에서도 또렷하게
  draw("#ffffff", 5)
  return g.getImageData(0, 0, size, size)
}

/** 시작·도착 표시 — 같은 자리(순환 코스)면 하나로 */
function endpointEl(label: string, color: string): HTMLDivElement {
  const el = document.createElement("div")
  el.textContent = label
  el.style.cssText = `
    min-width: 26px; height: 26px; padding: 0 6px; border-radius: 13px;
    background: ${color}; color: #fff; border: 2px solid #fff;
    box-shadow: 0 1px 5px rgba(0,0,0,.35);
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 800; letter-spacing: .02em; white-space: nowrap;
  `
  return el
}

/** 코스 좌표의 첫 점·끝 점 (멀티라인이면 첫 구간 시작, 마지막 구간 끝) */
function courseEnds(
  coords: EventCourse["coordinates"],
): { start: [number, number]; end: [number, number] } | null {
  if (!coords || coords.length === 0) return null
  const isMulti = Array.isArray((coords[0] as unknown[])[0])
  const segs = (isMulti ? coords : [coords]) as [number, number, number?][][]
  const first = segs.find((s) => s.length > 0)?.[0]
  const lastSeg = [...segs].reverse().find((s) => s.length > 0)
  const last = lastSeg?.[lastSeg.length - 1]
  if (!first || !last) return null
  return { start: [first[0], first[1]], end: [last[0], last[1]] }
}
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
  /** 체크포인트 마커 클릭 (공개 지도 페이지의 포인트 상세용) */
  onCheckpointSelect?: (cp: EventCourseCheckpoint) => void
  className?: string
  height?: number | string
  /** true 면 라운드/테두리 없이 컨테이너를 꽉 채움 (전체 화면 배치용) */
  bare?: boolean
  /** 브라우저 GPS '내 위치' 버튼(파란 점 + 정확도 원 + 따라가기) — 공개 지도 페이지용 */
  enableGeolocate?: boolean
  /** Mapbox 스타일 (지형/도로/위성). 부모가 컨트롤. 값이 바뀌면 setStyle. */
  mapStyle?: MapStyleKey
  /** true 면 각 세그먼트를 팔레트 색으로 순환 표시. */
  segmentsColored?: boolean
  /** 앱에서 보낸 SOS 위치 — 빨간 맥박 마커 + 보낸 사람 (관제, 2026-10-23) */
  sosPoints?: { id: string; lat: number; lng: number; label: string }[]
  /** { id, n } — n 이 바뀔 때마다 그 SOS 로 flyTo */
  sosFocus?: { id: string; n: number } | null
  /** 마커 글자 지정 (예: 조 이름) — 없으면 이름·순위 기본 표기 */
  markerText?: (r: RankedEntry) => string
  /** 이 반경(m) 안에 모인 참가자는 마커 하나로 묶고 아바타를 겹쳐 표시 */
  groupRadiusM?: number
}

const DEM_SOURCE = "mapbox-dem"
const TERRAIN_PITCH = 55

/** geojson 소스를 지우지 않고 데이터만 교체 — 3D 지형이 켜진 상태에서
 *  removeSource 를 하면 mapbox-gl 이 지형 갱신 중 예외를 던진다. */
function upsertGeojsonSource(
  map: mapboxgl.Map,
  id: string,
  data: GeoJSON.Feature | GeoJSON.FeatureCollection,
) {
  const src = map.getSource(id) as mapboxgl.GeoJSONSource | undefined
  if (src) src.setData(data)
  else map.addSource(id, { type: "geojson", data })
}

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

/** 지도용 짧은 이름 — 괄호 부가정보(IMEI 등) 제거 + 길이 제한 (상세는 사이드바) */
function markerShortName(name: string): string {
  const base = name.replace(/\s*[(（].*$/, "").trim() || name
  return base.length > 12 ? `${base.slice(0, 12)}…` : base
}

function markerLabel(r: RankedEntry): string {
  const flag = r.finished ? "✓ " : ""
  const rank = r.rank != null && r.rank <= 3 ? `${r.rank}위 ` : ""
  const bib = r.entry.bib_no ? `#${r.entry.bib_no} ` : ""
  // 스탬프 게임 이벤트 — 조별 실시간 점수를 마커에 함께 표시
  const score = r.gameScore != null ? ` · ${r.gameScore}점` : ""
  return `${flag}${rank}${bib}${markerShortName(r.entry.display_name)}${score}`
}

/** 겹침 대비 z-index: 선택 > SOS > 순위 높은 순. 호버 시 일시적으로 최상단 */
function markerZIndex(r: RankedEntry, selected: boolean): string {
  if (selected) return "1000"
  if (r.status === "sos") return "900"
  if (r.rank != null) return String(600 - Math.min(r.rank, 500))
  return "100"
}

/** 반경 안에 모인 참가자 묶기 — 반경이 없으면 한 사람당 마커 하나.
 *  순서에 따라 묶음이 흔들리지 않도록 id 순으로 앞사람 기준 그리디 배정 */
function groupEntries(
  entries: RankedEntry[],
  radiusM?: number,
): { key: string; members: RankedEntry[]; lng: number; lat: number }[] {
  const located = entries.filter(
    (r) => r.entry.lat != null && r.entry.lng != null,
  )
  if (!radiusM) {
    return located.map((r) => ({
      key: r.entry.entry_id,
      members: [r],
      lng: r.entry.lng!,
      lat: r.entry.lat!,
    }))
  }
  const distM = (a: RankedEntry, b: RankedEntry) => {
    const kx = 111_320 * Math.cos((a.entry.lat! * Math.PI) / 180)
    return Math.hypot(
      (a.entry.lng! - b.entry.lng!) * kx,
      (a.entry.lat! - b.entry.lat!) * 110_570,
    )
  }
  const groups: RankedEntry[][] = []
  for (const r of [...located].sort((a, b) =>
    a.entry.entry_id.localeCompare(b.entry.entry_id),
  )) {
    const g = groups.find((m) => distM(m[0], r) <= radiusM)
    if (g) g.push(r)
    else groups.push([r])
  }
  return groups.map((members) => ({
    key: members.length === 1 ? members[0].entry.entry_id : `g:${members.map((m) => m.entry.entry_id).join(",")}`,
    members,
    lng: members.reduce((s, m) => s + m.entry.lng!, 0) / members.length,
    lat: members.reduce((s, m) => s + m.entry.lat!, 0) / members.length,
  }))
}

/** Mapbox 가 붙인 마커 클래스를 건드리지 않도록 외부 el 안에 chip div 를 두고 그것만 스타일링 */
function styleMarkerEl(
  el: HTMLElement,
  members: RankedEntry[],
  color: string,
  selected: boolean,
  label: string,
) {
  const r = members[0]
  let chip = el.firstElementChild as HTMLDivElement | null
  if (!chip) {
    chip = document.createElement("div")
    el.appendChild(chip)
  }
  // 사진(아바타) + 짧은 이름 — textContent/src 만 갱신 (XSS 안전). 묶인 마커는 아바타를 겹쳐 표시
  chip.replaceChildren()
  // 사진이 없으면 닉네임 첫 글자 동그라미
  const stack = document.createElement("span")
  stack.className = "-ml-1 mr-1 flex shrink-0"
  members.slice(0, 4).forEach((m, i) => {
    const overlap = i > 0 ? " -ml-2" : ""
    if (m.entry.avatar_url) {
      const img = document.createElement("img")
      img.src = m.entry.avatar_url
      img.alt = ""
      img.className =
        "h-[18px] w-[18px] rounded-full border border-white/70 object-cover" +
        overlap
      stack.appendChild(img)
    } else {
      const initial = document.createElement("span")
      initial.textContent = (m.entry.display_name.trim() || "?").slice(0, 1)
      initial.className =
        "flex h-[18px] w-[18px] items-center justify-center rounded-full border border-white/70 bg-gray-100 text-[9px] font-bold text-gray-800" +
        overlap
      stack.appendChild(initial)
    }
  })
  chip.appendChild(stack)
  const text = document.createElement("span")
  text.textContent = members.length > 1 ? `${label} · ${members.length}명` : label
  chip.appendChild(text)
  // 배터리 — 한 사람 마커만 (묶인 마커는 목록에서 확인). 20% 이하면 빨갛게
  const pct = members.length === 1 ? batteryPercentOf(r.entry) : null
  if (pct != null) {
    const bat = document.createElement("span")
    bat.textContent = `🔋${pct}%`
    bat.className =
      "ml-1.5 rounded-full px-1.5 text-[10px] font-semibold tabular-nums " +
      (pct <= 20 ? "bg-red-600 text-white" : "bg-black/25 text-white")
    chip.appendChild(bat)
  }
  const sos = members.some((m) => m.status === "sos")
  // 도착자는 신호가 끊겨도 정상 표시 유지
  const noSignal = members.every(
    (m) => (m.status === "stale" || m.status === "noSignal") && !m.finished,
  )
  // 장시간 정지(30분+) — 신호는 정상, 노란 링으로 경고
  const stationary = members.every(
    (m) =>
      m.status === "ok" &&
      !m.finished &&
      m.stationarySec != null &&
      m.stationarySec >= STATIONARY_THRESHOLD_SEC,
  )
  const podium = members.length === 1 && r.rank != null && r.rank <= 3
  chip.className =
    "inline-flex w-max items-center rounded-full border border-white/80 px-2 py-0.5 text-[11px] font-bold text-white shadow-md cursor-pointer select-none whitespace-nowrap" +
    (sos ? " animate-pulse ring-2 ring-red-500" : "") +
    // 신호 없음: 빨간 링 + 살짝 흐리게 (SOS 의 빨간 배경/펄스와 구분)
    (noSignal ? " opacity-75 ring-2 ring-red-500" : "") +
    (stationary && !selected ? " ring-2 ring-amber-400" : "") +
    // 1~3위: 색 구분 없이 살짝 크게 ("n위" 텍스트로만 표시)
    (podium ? " text-[12px]" : "") +
    (selected ? " ring-2 ring-white scale-110" : "")
  chip.style.background = sos ? "#dc2626" : color

  const z = String(
    Math.max(...members.map((m) => Number(markerZIndex(m, selected)))),
  )
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
  onCheckpointSelect,
  className,
  height = 520,
  bare = false,
  enableGeolocate = false,
  mapStyle = "outdoors",
  segmentsColored = false,
  sosPoints,
  sosFocus,
  markerText,
  groupRadiusM,
}: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map())
  const cpMarkersRef = useRef<mapboxgl.Marker[]>([])
  const applyOverlaysRef = useRef<((fitInitial: boolean) => void) | null>(null)
  const didFitToEntriesRef = useRef(false)
  const initialStyleMount = useRef(true)
  const segmentsColoredRef = useRef(segmentsColored)
  segmentsColoredRef.current = segmentsColored
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const enable3dRef = useRef(enable3d)
  enable3dRef.current = enable3d
  const onElevationsRef = useRef(onElevations)
  onElevationsRef.current = onElevations
  const onCheckpointSelectRef = useRef(onCheckpointSelect)
  onCheckpointSelectRef.current = onCheckpointSelect
  const markerTextRef = useRef(markerText)
  markerTextRef.current = markerText

  // 지도 초기화 — 코스가 있으면 코스 기준, 없으면 참가자 위치에 맞춰 이후 fit
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!containerRef.current || !token) return
    mapboxgl.accessToken = token

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_STYLES[mapStyle],
      center: course?.center ?? DEFAULT_CENTER,
      zoom: course ? 11 : 6,
      attributionControl: false,
    })
    mapRef.current = map
    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-right",
    )
    if (enableGeolocate) {
      // 내 위치 — 버튼 클릭 시 권한 요청, 파란 점 + 정확도 원, 이동 시 따라가기
      map.addControl(
        new mapboxgl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true,
          showUserHeading: true,
        }),
        "top-right",
      )
    }

    // 스타일 로드 후 반복 사용 가능한 오버레이 재적용 (마커 재생성 없음)
    const applyOverlays = (fitInitial: boolean) => {
      applyKoreanLabels(map)

      // 코스 라인
      if (course?.coordinates) {
        const coords = course.coordinates
        const isMulti =
          coords.length > 0 && Array.isArray((coords[0] as unknown[])[0])
        const colored = segmentsColoredRef.current

        if (map.getLayer("course-arrows")) map.removeLayer("course-arrows")
        if (map.getLayer("course-line")) map.removeLayer("course-line")

        if (colored && isMulti) {
          // 세그먼트별 팔레트 순환 컬러 — FeatureCollection 으로 index 부여
          const segs = coords as [number, number, number?][][]
          const features = segs.map((seg, i) => ({
            type: "Feature" as const,
            properties: { i },
            geometry: {
              type: "LineString" as const,
              coordinates: seg.map(([lng, lat]) => [lng, lat]),
            },
          }))
          upsertGeojsonSource(map, "course", {
            type: "FeatureCollection",
            features,
          })
          const colorExpr = [
            "match",
            ["%", ["get", "i"], TRAIL_SEGMENT_PALETTE.length],
            ...TRAIL_SEGMENT_PALETTE.flatMap((c, idx) => [idx, c]),
            TRAIL_SEGMENT_PALETTE[0],
          ] as unknown as mapboxgl.ExpressionSpecification
          map.addLayer({
            id: "course-line",
            type: "line",
            source: "course",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: {
              "line-color": colorExpr,
              "line-width": 3,
              "line-opacity": 0.9,
            },
          })
        } else {
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
          upsertGeojsonSource(map, "course", {
            type: "Feature",
            properties: {},
            geometry,
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

        // 진행 방향 화살표 — 선을 따라 일정 간격 (스타일을 바꾸면 이미지가 사라지므로 매번 확인)
        if (!map.hasImage(ARROW_IMAGE)) {
          map.addImage(ARROW_IMAGE, courseArrowImage(), { pixelRatio: 2 })
        }
        map.addLayer({
          id: "course-arrows",
          type: "symbol",
          source: "course",
          layout: {
            "symbol-placement": "line",
            "symbol-spacing": 90,
            "icon-image": ARROW_IMAGE,
            "icon-size": ["interpolate", ["linear"], ["zoom"], 10, 0.8, 14, 1.1],
            "icon-rotation-alignment": "map",
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
          },
        })
      }

      // 이동 궤적(꼬리) — setData 로 갱신
      if (map.getLayer("tails-line")) map.removeLayer("tails-line")
      if (!map.getSource("tails")) {
        map.addSource("tails", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        })
      }
      map.addLayer({
        id: "tails-line",
        type: "line",
        source: "tails",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#475569",
          "line-width": 2,
          "line-opacity": 0.45,
        },
      })

      // 3D 지형 재적용
      ensureDemSource(map)
      if (enable3dRef.current) {
        map.setTerrain({ source: DEM_SOURCE, exaggeration: 1.3 })
        if (fitInitial) {
          map.easeTo({ pitch: TERRAIN_PITCH, duration: 800 })
        }
      }

      if (fitInitial && course?.bounds) {
        const fb: LngLatBoundsLike = [
          [course.bounds.minLon, course.bounds.minLat],
          [course.bounds.maxLon, course.bounds.maxLat],
        ]
        map.fitBounds(fb, { padding: 60, animate: false })
      }
    }
    applyOverlaysRef.current = applyOverlays

    map.on("load", () => {
      applyOverlays(true)

      // 시작·도착 — 50m 안이면 순환 코스로 보고 하나만
      const ends = courseEnds(course?.coordinates ?? null)
      if (ends) {
        const loop =
          haversineMeters(ends.start[1], ends.start[0], ends.end[1], ends.end[0]) < 50
        cpMarkersRef.current.push(
          new mapboxgl.Marker(
            endpointEl(loop ? "출발·도착" : "출발", "#16a34a"),
          )
            .setLngLat(ends.start)
            .addTo(map),
        )
        if (!loop) {
          cpMarkersRef.current.push(
            new mapboxgl.Marker(endpointEl("도착", "#111827"))
              .setLngLat(ends.end)
              .addTo(map),
          )
        }
      }

      // 체크포인트 마커 — DOM 마커라 스타일 변경 시 유지되므로 최초 1회만
      for (const cp of course?.checkpoints ?? []) {
        const icon =
          CHECKPOINT_MARKER_ICONS[cp.marker_icon ?? ""] ?? DEFAULT_MARKER_ICON
        const el = document.createElement("div")
        el.className =
          "flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-black/10 bg-white shadow"
        el.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="${icon.color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${icon.paths
          .map((d) => `<path d="${d}"/>`)
          .join("")}</svg>`
        el.title = cp.title
        el.addEventListener("click", (ev) => {
          ev.stopPropagation()
          onCheckpointSelectRef.current?.(cp)
        })
        cpMarkersRef.current.push(
          new mapboxgl.Marker(el).setLngLat([cp.lng, cp.lat]).addTo(map),
        )
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

  // 스타일 변경 — setStyle 후 오버레이 재적용 (마커는 DOM 이라 유지)
  useEffect(() => {
    if (initialStyleMount.current) {
      initialStyleMount.current = false
      return
    }
    const map = mapRef.current
    if (!map) return
    const target = MAPBOX_STYLES[mapStyle]
    map.setStyle(target)
    map.once("style.load", () => {
      applyOverlaysRef.current?.(false)
    })
  }, [mapStyle])

  // 세그먼트 컬러 옵션 변경 — 라인만 재적용
  const initialColorMount = useRef(true)
  useEffect(() => {
    if (initialColorMount.current) {
      initialColorMount.current = false
      return
    }
    const map = mapRef.current
    if (!map) return
    if (map.loaded()) applyOverlaysRef.current?.(false)
    else map.once("load", () => applyOverlaysRef.current?.(false))
  }, [segmentsColored])

  // 참가자 마커 동기화 (entry_id 기준 diff — 위치/스타일만 갱신)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const apply = () => {
      const seen = new Set<string>()
      const textOf = (r: RankedEntry) =>
        markerTextRef.current?.(r) ?? markerLabel(r)
      for (const g of groupEntries(entries, groupRadiusM)) {
        const r = g.members[0]
        seen.add(g.key)
        const color = categoryColor(r.entry.category, categories)
        const selected = g.members.some((m) => m.entry.entry_id === selectedId)
        const label = Array.from(new Set(g.members.map(textOf))).join(" · ")
        const existing = markersRef.current.get(g.key)
        if (existing) {
          existing.setLngLat([g.lng, g.lat])
          styleMarkerEl(
            existing.getElement() as HTMLDivElement,
            g.members,
            color,
            selected,
            label,
          )
        } else {
          const el = document.createElement("div")
          styleMarkerEl(el, g.members, color, selected, label)
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
            g.key,
            new mapboxgl.Marker(el).setLngLat([g.lng, g.lat]).addTo(map),
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
  }, [entries, categories, selectedId, course, groupRadiusM])

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
    } else if (r && focusSignal > 0) {
      // 위치가 없으면 지도가 움직이지 않아 고장처럼 보임 — 이유를 알려준다
      toast(
        isGpsWaiting(r.entry)
          ? `${r.entry.display_name}: 아직 GPS 위치가 없어요`
          : `${r.entry.display_name}: 기기 신호가 없어요`,
        {
          description: isGpsWaiting(r.entry)
            ? "기기 신호는 들어오고 있어요. 하늘이 트인 곳에 있으면 곧 위치가 잡혀요."
            : "기기가 꺼져 있거나 통신이 안 되는 곳에 있어요.",
        },
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, focusSignal])

  // SOS 마커 — 해제되면 사라지고, 새 SOS 는 바로 추가 (참가자 마커보다 위)
  const sosMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map())
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const seen = new Set<string>()
    for (const p of sosPoints ?? []) {
      seen.add(p.id)
      const existing = sosMarkersRef.current.get(p.id)
      if (existing) {
        existing.setLngLat([p.lng, p.lat])
        continue
      }
      const el = document.createElement("div")
      el.style.cssText = "display:flex;flex-direction:column;align-items:center;z-index:2000;pointer-events:none"
      el.innerHTML = `
        <div style="position:relative;width:34px;height:34px">
          <div style="position:absolute;inset:0;border-radius:9999px;background:rgba(220,38,38,0.35);animation:sosPulse 1.4s ease-out infinite"></div>
          <div style="position:absolute;inset:7px;border-radius:9999px;background:#DC2626;border:3px solid #fff;box-shadow:0 0 0 2px rgba(220,38,38,0.6)"></div>
        </div>
        <div style="margin-top:2px;padding:2px 6px;border-radius:6px;background:#DC2626;color:#fff;font-size:11px;font-weight:800;white-space:nowrap">SOS · ${p.label.replace(/[<>&"]/g, "")}</div>`
      if (!document.getElementById("sos-pulse-style")) {
        const st = document.createElement("style")
        st.id = "sos-pulse-style"
        st.textContent = "@keyframes sosPulse{0%{transform:scale(.6);opacity:1}100%{transform:scale(1.8);opacity:0}}"
        document.head.appendChild(st)
      }
      sosMarkersRef.current.set(p.id, new mapboxgl.Marker({ element: el, anchor: "top", offset: [0, -17] }).setLngLat([p.lng, p.lat]).addTo(map))
    }
    for (const [id, m] of sosMarkersRef.current) {
      if (!seen.has(id)) {
        m.remove()
        sosMarkersRef.current.delete(id)
      }
    }
  }, [sosPoints])
  useEffect(() => {
    const map = mapRef.current
    if (!map || !sosFocus) return
    const p = (sosPoints ?? []).find((x) => x.id === sosFocus.id)
    if (p) map.flyTo({ center: [p.lng, p.lat], zoom: Math.max(map.getZoom(), 16) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sosFocus])

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
