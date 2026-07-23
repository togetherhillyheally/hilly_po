/**
 * 좌표 거리 계산 유틸 (Haversine formula) — hilly_rn/lib/utils/geo.ts에서 그대로 포팅
 */

const R = 6371e3; // 지구 반지름 (미터)
const toRad = (deg: number) => (deg * Math.PI) / 180;

export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function haversineM(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number }
): number {
  return haversineMeters(a.lat, a.lon, b.lat, b.lon);
}

export interface LatLonBounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

/**
 * 중심점 + 반경(m)으로 지오데식 원 폴리곤 GeoJSON 좌표 생성 — 지도 위 도착 반경 표시용.
 * 반환: [lng, lat][] 링 (닫힌 폴리곤, steps+1 개 점)
 */
export function makeCircleRing(
  lng: number,
  lat: number,
  radiusM: number,
  steps = 64
): [number, number][] {
  const ring: [number, number][] = [];
  const latRad = toRad(lat);
  const dLat = radiusM / R;
  const dLon = radiusM / (R * Math.cos(latRad));
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * 2 * Math.PI;
    ring.push([
      lng + (dLon * Math.cos(theta) * 180) / Math.PI,
      lat + (dLat * Math.sin(theta) * 180) / Math.PI,
    ]);
  }
  return ring;
}
