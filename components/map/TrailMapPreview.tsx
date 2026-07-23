"use client";

import { useEffect, useRef } from "react";
import mapboxgl, { type LngLatBoundsLike } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { applyKoreanLabels } from "@/lib/mapbox-locale";

const TRAIL_COLOR = "#DC2F55";
const START_COLOR = "#22c55e";
const END_COLOR = "#DC2F55";
const PENDING_COLOR = "#f59e0b"; // 노란색 — 미확정
const SE_CLOSE_THRESHOLD = 0.0005; // 약 50m

const MAPBOX_STYLE = "mapbox://styles/mapbox/outdoors-v12";

type Coord = [number, number] | [number, number, number];
type Coordinates = Coord[] | Coord[][];

export type LatLng = { lat: number; lng: number };

export type TrailMapPreviewProps = {
  /** GeoJSON 순서 [lng, lat, ele?]. 단일 segment(LineString) 또는 multi(MultiLineString). */
  coordinates: Coordinates;
  bounds?: { minLat: number; maxLat: number; minLon: number; maxLon: number };
  /** trail.start_lat/lng 가 있으면 전달. null/undefined 이면 coordinates 첫 점 사용. */
  start?: LatLng | null;
  /** trail.end_lat/lng 가 있으면 전달. null/undefined 이면 coordinates 마지막 점 사용. */
  end?: LatLng | null;
  /** 편집 모드. 활성 시 지도 클릭하면 onMapClick 호출되고 커서가 crosshair 로 바뀜. */
  editMode?: "start" | "end" | null;
  /** 모드 활성 + 사용자가 지도를 클릭하면 호출. */
  onMapClick?: (point: LatLng) => void;
  /** 미확정 위치(노란 마커). 클릭으로 선택했으나 아직 저장 안 된 좌표. */
  pendingPoint?: LatLng | null;
  className?: string;
  height?: number | string;
};

function isMulti(coords: Coordinates): coords is Coord[][] {
  return (
    coords.length > 0 &&
    Array.isArray(coords[0]) &&
    coords[0].length > 0 &&
    Array.isArray((coords[0] as unknown[])[0])
  );
}

function flatten(coords: Coordinates): Coord[] {
  return isMulti(coords) ? coords.flat() : (coords as Coord[]);
}

function toRoutes(coords: Coordinates): Coord[][] {
  if (isMulti(coords)) return coords;
  if (coords.length === 0) return [];
  return [coords as Coord[]];
}

function makeMarkerEl(
  bg: string,
  label: string,
  size = 28,
  textSize = 11
): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = `
    width: ${size}px; height: ${size}px; border-radius: 50%;
    background: ${bg}; color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: ${textSize}px; font-weight: 700; letter-spacing: 0.04em;
    border: 2px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.35);
    user-select: none; pointer-events: none;
  `;
  el.textContent = label;
  return el;
}

export default function TrailMapPreview({
  coordinates,
  bounds,
  start,
  end,
  editMode,
  onMapClick,
  pendingPoint,
  className,
  height = 360,
}: TrailMapPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const startMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const endMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const seMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const pendingMarkerRef = useRef<mapboxgl.Marker | null>(null);

  // 콜백을 ref 로 저장 — useEffect deps 회피
  const onClickRef = useRef(onMapClick);
  onClickRef.current = onMapClick;
  const editModeRef = useRef(editMode);
  editModeRef.current = editMode;

  // 지도 초기화 (coordinates/bounds 변경 시 재초기화)
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!containerRef.current || !token) return;
    mapboxgl.accessToken = token;

    const flat = flatten(coordinates);
    if (flat.length === 0) return;

    const initialCenter: [number, number] = bounds
      ? [
          (bounds.minLon + bounds.maxLon) / 2,
          (bounds.minLat + bounds.maxLat) / 2,
        ]
      : [flat[0][0], flat[0][1]];

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_STYLE,
      center: initialCenter,
      zoom: 11,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-right"
    );

    map.on("click", (e) => {
      if (editModeRef.current && onClickRef.current) {
        onClickRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      }
    });

    map.on("load", () => {
      applyKoreanLabels(map);
      const routes = toRoutes(coordinates);
      const geometry =
        routes.length === 1
          ? {
              type: "LineString" as const,
              coordinates: routes[0].map(([lng, lat]) => [lng, lat]),
            }
          : {
              type: "MultiLineString" as const,
              coordinates: routes.map((seg) =>
                seg.map(([lng, lat]) => [lng, lat])
              ),
            };
      map.addSource("trail", {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry },
      });
      map.addLayer({
        id: "trail-line",
        type: "line",
        source: "trail",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": TRAIL_COLOR,
          "line-width": 3,
          "line-opacity": 0.9,
        },
      });

      // fitBounds
      let fb: LngLatBoundsLike;
      if (bounds) {
        fb = [
          [bounds.minLon, bounds.minLat],
          [bounds.maxLon, bounds.maxLat],
        ];
      } else {
        let minLat = Infinity,
          maxLat = -Infinity,
          minLon = Infinity,
          maxLon = -Infinity;
        for (const [lng, lat] of flat) {
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
          if (lng < minLon) minLon = lng;
          if (lng > maxLon) maxLon = lng;
        }
        fb = [
          [minLon, minLat],
          [maxLon, maxLat],
        ];
      }
      map.fitBounds(fb, { padding: 40, animate: false });
    });

    return () => {
      map.remove();
      mapRef.current = null;
      startMarkerRef.current = null;
      endMarkerRef.current = null;
      seMarkerRef.current = null;
      pendingMarkerRef.current = null;
    };
  }, [coordinates, bounds]);

  // 시작/끝 마커 업데이트 — 지도 로드 후 props 변경에 반응
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      const flat = flatten(coordinates);
      if (flat.length === 0) return;
      const defStart = flat[0];
      const defEnd = flat[flat.length - 1];

      const startLng = start?.lng ?? defStart[0];
      const startLat = start?.lat ?? defStart[1];
      const endLng = end?.lng ?? defEnd[0];
      const endLat = end?.lat ?? defEnd[1];

      const isClose =
        Math.abs(startLng - endLng) < SE_CLOSE_THRESHOLD &&
        Math.abs(startLat - endLat) < SE_CLOSE_THRESHOLD;

      // 기존 마커 정리
      startMarkerRef.current?.remove();
      endMarkerRef.current?.remove();
      seMarkerRef.current?.remove();
      startMarkerRef.current = null;
      endMarkerRef.current = null;
      seMarkerRef.current = null;

      if (isClose) {
        const el = makeMarkerEl(START_COLOR, "S/E", 32, 10);
        seMarkerRef.current = new mapboxgl.Marker(el)
          .setLngLat([startLng, startLat])
          .addTo(map);
      } else {
        const sEl = makeMarkerEl(START_COLOR, "S");
        startMarkerRef.current = new mapboxgl.Marker(sEl)
          .setLngLat([startLng, startLat])
          .addTo(map);
        const eEl = makeMarkerEl(END_COLOR, "E");
        endMarkerRef.current = new mapboxgl.Marker(eEl)
          .setLngLat([endLng, endLat])
          .addTo(map);
      }
    };

    if (map.loaded()) apply();
    else map.once("load", apply);
  }, [coordinates, start, end]);

  // pending 마커 업데이트
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    pendingMarkerRef.current?.remove();
    pendingMarkerRef.current = null;
    if (!pendingPoint) return;
    const label = editMode === "end" ? "E?" : "S?";
    const el = makeMarkerEl(PENDING_COLOR, label, 32, 10);
    pendingMarkerRef.current = new mapboxgl.Marker(el)
      .setLngLat([pendingPoint.lng, pendingPoint.lat])
      .addTo(map);
  }, [pendingPoint, editMode]);

  // 편집 모드 커서 스타일
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const canvas = map.getCanvas();
    canvas.style.cursor = editMode ? "crosshair" : "";
    return () => {
      canvas.style.cursor = "";
    };
  }, [editMode]);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
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
        <br />
        <code className="text-xs">NEXT_PUBLIC_MAPBOX_TOKEN</code> 환경변수를
        설정해주세요.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={
        "rounded-xl overflow-hidden border border-white/10 " +
        (className ?? "")
      }
      style={{ height, width: "100%" }}
    />
  );
}
