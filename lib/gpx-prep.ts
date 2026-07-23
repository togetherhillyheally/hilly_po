/**
 * 업로드 GPX → trails INSERT용 geometry (다운샘플·통계)
 * hilly_rn/lib/gpxTrailPrep.ts 에서 포팅. RN 전용 fallback(parseGPX)은 빼고
 * 정규식 파싱만 사용. 표준 GPX 1.0/1.1 파일이면 충분히 처리됨.
 */

import { haversineM } from "@/lib/geo";

const TARGET_POINTS = 2400;
const MIN_POINTS_PER_SEGMENT = 8;

type LatLonEle = { lat: number; lon: number; ele?: number };

function segmentsFromGpx(gpxContent: string): LatLonEle[][] {
  const segments: LatLonEle[][] = [];
  const eleInner = /<ele>([^<]+)<\/ele>/;

  function extractTrkpts(segText: string): LatLonEle[] {
    const pts: LatLonEle[] = [];
    const reLatLon = /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"/g;
    let m: RegExpExecArray | null;
    let prevIdx = -1;
    let prevLat = 0;
    let prevLon = 0;
    while ((m = reLatLon.exec(segText)) !== null) {
      if (prevIdx >= 0) {
        const sl = segText.slice(prevIdx, m.index);
        const e = sl.match(eleInner);
        pts.push({
          lat: prevLat,
          lon: prevLon,
          ele: e ? parseFloat(e[1]) : undefined,
        });
      }
      prevIdx = m.index;
      prevLat = parseFloat(m[1]);
      prevLon = parseFloat(m[2]);
    }
    if (prevIdx >= 0) {
      const sl = segText.slice(prevIdx, Math.min(prevIdx + 500, segText.length));
      const e = sl.match(eleInner);
      pts.push({
        lat: prevLat,
        lon: prevLon,
        ele: e ? parseFloat(e[1]) : undefined,
      });
    }
    if (pts.length === 0) {
      const reLonLat = /<trkpt\s+lon="([^"]+)"\s+lat="([^"]+)"/g;
      prevIdx = -1;
      while ((m = reLonLat.exec(segText)) !== null) {
        if (prevIdx >= 0) {
          const sl = segText.slice(prevIdx, m.index);
          const e = sl.match(eleInner);
          pts.push({
            lat: prevLat,
            lon: prevLon,
            ele: e ? parseFloat(e[1]) : undefined,
          });
        }
        prevIdx = m.index;
        prevLon = parseFloat(m[1]);
        prevLat = parseFloat(m[2]);
      }
      if (prevIdx >= 0) {
        const sl = segText.slice(
          prevIdx,
          Math.min(prevIdx + 500, segText.length)
        );
        const e = sl.match(eleInner);
        pts.push({
          lat: prevLat,
          lon: prevLon,
          ele: e ? parseFloat(e[1]) : undefined,
        });
      }
    }
    return pts;
  }

  const trksegRegex = /<trkseg>([\s\S]*?)<\/trkseg>/g;
  let sm: RegExpExecArray | null;
  while ((sm = trksegRegex.exec(gpxContent)) !== null) {
    const pts = extractTrkpts(sm[1]);
    if (pts.length > 0) segments.push(pts);
  }
  if (segments.length === 0) {
    const all = extractTrkpts(gpxContent);
    if (all.length > 0) segments.push(all);
  }
  return segments;
}

function downsample(points: LatLonEle[], targetCount: number): LatLonEle[] {
  if (points.length <= targetCount) return points;
  const step = points.length / targetCount;
  const result: LatLonEle[] = [];
  for (let i = 0; i < targetCount; i++) {
    result.push(points[Math.round(i * step)]);
  }
  result[result.length - 1] = points[points.length - 1];
  return result;
}

const ELE_THRESHOLD = 4; // 미터

function accumulateSegmentStats(
  points: LatLonEle[],
  acc: { totalDist: number; totalAscent: number; totalDescent: number }
): void {
  let refEle: number | undefined;
  for (const p of points) {
    if (p.ele != null) {
      refEle = p.ele;
      break;
    }
  }
  for (let i = 1; i < points.length; i++) {
    acc.totalDist += haversineM(points[i - 1], points[i]);
    const ele = points[i].ele;
    if (ele == null || refEle == null) continue;
    const diff = ele - refEle;
    if (diff >= ELE_THRESHOLD) {
      acc.totalAscent += diff;
      refEle = ele;
    } else if (diff <= -ELE_THRESHOLD) {
      acc.totalDescent += -diff;
      refEle = ele;
    }
  }
}

function calcStatsMulti(segments: LatLonEle[][]): {
  distanceKm: number;
  totalAscent: number;
  totalDescent: number;
} {
  const acc = { totalDist: 0, totalAscent: 0, totalDescent: 0 };
  for (const seg of segments) accumulateSegmentStats(seg, acc);
  return {
    distanceKm: Math.round((acc.totalDist / 1000) * 10) / 10,
    totalAscent: Math.round(acc.totalAscent),
    totalDescent: Math.round(acc.totalDescent),
  };
}

export type PreparedTrailGeometry = {
  nameFromGpx?: string;
  bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number };
  center: [number, number];
  coordinates:
    | ([number, number] | [number, number, number])[]
    | ([number, number] | [number, number, number])[][];
  distanceKm: number;
  totalAscentM: number;
};

function extractGpxName(gpxText: string): string | undefined {
  const nameMatch = gpxText.match(/<name>([^<]+)<\/name>/);
  return nameMatch?.[1]?.trim();
}

export function prepareTrailFromGpxText(
  gpxText: string
): PreparedTrailGeometry {
  const segments = segmentsFromGpx(gpxText);
  const totalCount = segments.reduce((sum, s) => sum + s.length, 0);

  if (totalCount < 2) {
    throw new Error("GPX에 트랙 포인트가 부족합니다.");
  }

  const name = extractGpxName(gpxText);
  return buildPreparedMulti(segments, name);
}

function buildPreparedMulti(
  segments: LatLonEle[][],
  nameFromGpx?: string
): PreparedTrailGeometry {
  let minLat = Infinity,
    maxLat = -Infinity,
    minLon = Infinity,
    maxLon = -Infinity;
  for (const seg of segments) {
    for (const p of seg) {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lon < minLon) minLon = p.lon;
      if (p.lon > maxLon) maxLon = p.lon;
    }
  }
  const bounds = { minLat, maxLat, minLon, maxLon };

  const stats = calcStatsMulti(segments);
  const distanceKm = stats.distanceKm;
  const totalAscentM = stats.totalAscent;

  const totalCount = segments.reduce((sum, s) => sum + s.length, 0);
  const sampledSegments: LatLonEle[][] = segments.map((seg) => {
    if (seg.length <= MIN_POINTS_PER_SEGMENT) return seg;
    const proportional = Math.round((seg.length / totalCount) * TARGET_POINTS);
    const target = Math.min(
      seg.length,
      Math.max(MIN_POINTS_PER_SEGMENT, proportional)
    );
    return downsample(seg, target);
  });

  const toCoord = (
    p: LatLonEle
  ): [number, number] | [number, number, number] =>
    p.ele != null && Number.isFinite(p.ele) ? [p.lon, p.lat, p.ele] : [p.lon, p.lat];

  let coordinates: PreparedTrailGeometry["coordinates"];
  if (sampledSegments.length === 1) {
    coordinates = sampledSegments[0].map(toCoord);
  } else {
    coordinates = sampledSegments.map((seg) => seg.map(toCoord));
  }

  const center: [number, number] = [
    (bounds.minLon + bounds.maxLon) / 2,
    (bounds.minLat + bounds.maxLat) / 2,
  ];

  return {
    nameFromGpx: nameFromGpx?.trim() || undefined,
    bounds,
    center,
    coordinates,
    distanceKm,
    totalAscentM,
  };
}

export function displayNameFromFileName(fileName: string): string {
  const base = fileName.replace(/\.[^/.]+$/, "").replace(/_/g, " ").trim();
  return base.length > 0 ? base : "새 지도";
}
