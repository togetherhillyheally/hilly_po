"use client";

import { useEffect, useRef } from "react";
import mapboxgl, { type LngLatBoundsLike } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { applyKoreanLabels } from "@/lib/mapbox-locale";
import { syncRadiusCircles, type RadiusCircle } from "./radius-layer";

const TRAIL_COLOR = "#DC2F55";
const CP_COLOR = "#fb923c";
const CP_SELECTED_COLOR = "#f97316";
const CP_PENDING_COLOR = "#f59e0b";
const MAPBOX_STYLE = "mapbox://styles/mapbox/outdoors-v12";

type Coord = [number, number] | [number, number, number];
type Coordinates = Coord[] | Coord[][];

export type Checkpoint = {
  id: string;
  lng: number;
  lat: number;
  title: string;
  sort_order: number;
};

export type LatLng = { lat: number; lng: number };

export type CheckpointMapProps = {
  coordinates: Coordinates;
  bounds?: { minLat: number; maxLat: number; minLon: number; maxLon: number };
  checkpoints: Checkpoint[];
  selectedId?: string | null;
  /** 지도 클릭으로 새 체크포인트 추가 모드. activate 시 onMapClick 호출. */
  addMode?: boolean;
  /** 미확정 임시 위치 (지도 클릭으로 선택했으나 아직 저장 안 됨). */
  pendingPoint?: LatLng | null;
  /** 도착 반경 원 — 표시할 포인트만 전달 (예: 선택된 체크포인트) */
  radiusCircles?: RadiusCircle[];
  onMapClick?: (point: LatLng) => void;
  onMarkerClick?: (cpId: string) => void;
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

function makeCheckpointEl(
  num: number,
  bg: string,
  selected: boolean
): HTMLDivElement {
  const el = document.createElement("div");
  const size = selected ? 32 : 28;
  el.style.cssText = `
    width: ${size}px; height: ${size}px; border-radius: 50%;
    background: ${bg}; color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 700;
    border: 2px solid #fff; box-shadow: 0 1px 5px rgba(0,0,0,0.45);
    user-select: none; cursor: pointer;
    transition: transform .15s;
  `;
  el.textContent = String(num);
  return el;
}

function makePendingEl(): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = `
    width: 32px; height: 32px; border-radius: 50%;
    background: ${CP_PENDING_COLOR}; color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; font-weight: 800;
    border: 2px solid #fff; box-shadow: 0 1px 5px rgba(0,0,0,0.45);
    user-select: none; pointer-events: none;
    animation: cp-pulse 1s infinite alternate;
  `;
  el.textContent = "+";
  return el;
}

export default function CheckpointMap({
  coordinates,
  bounds,
  checkpoints,
  selectedId,
  addMode,
  pendingPoint,
  radiusCircles,
  onMapClick,
  onMarkerClick,
  className,
  height = 480,
}: CheckpointMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const pendingMarkerRef = useRef<mapboxgl.Marker | null>(null);

  // 콜백을 ref 로 보관
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;
  const onMarkerClickRef = useRef(onMarkerClick);
  onMarkerClickRef.current = onMarkerClick;
  const addModeRef = useRef(addMode);
  addModeRef.current = addMode;

  // 지도 초기화 — coordinates/bounds 가 바뀌면 새로 그림
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
      if (addModeRef.current && onMapClickRef.current) {
        onMapClickRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng });
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
          "line-opacity": 0.85,
        },
      });

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
      map.fitBounds(fb, { padding: 50, animate: false });
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      pendingMarkerRef.current = null;
    };
  }, [coordinates, bounds]);

  // 체크포인트 마커 동기화
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      // 기존 마커 정리
      for (const [, marker] of markersRef.current) marker.remove();
      markersRef.current.clear();

      for (const cp of checkpoints) {
        const isSel = selectedId === cp.id;
        const el = makeCheckpointEl(
          cp.sort_order,
          isSel ? CP_SELECTED_COLOR : CP_COLOR,
          isSel
        );
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          onMarkerClickRef.current?.(cp.id);
        });
        const m = new mapboxgl.Marker(el)
          .setLngLat([cp.lng, cp.lat])
          .addTo(map);
        markersRef.current.set(cp.id, m);
      }
    };

    if (map.loaded()) apply();
    else map.once("load", apply);
  }, [checkpoints, selectedId]);

  // pending 마커
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    pendingMarkerRef.current?.remove();
    pendingMarkerRef.current = null;
    if (!pendingPoint) return;
    const el = makePendingEl();
    pendingMarkerRef.current = new mapboxgl.Marker(el)
      .setLngLat([pendingPoint.lng, pendingPoint.lat])
      .addTo(map);
  }, [pendingPoint]);

  // 도착 반경 원 동기화
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => syncRadiusCircles(map, radiusCircles ?? []);
    if (map.loaded()) apply();
    else map.once("load", apply);
  }, [radiusCircles]);

  // 모드별 커서
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const canvas = map.getCanvas();
    canvas.style.cursor = addMode ? "crosshair" : "";
    return () => {
      canvas.style.cursor = "";
    };
  }, [addMode]);

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
