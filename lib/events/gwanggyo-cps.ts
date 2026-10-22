/** 낯선곳으로 — 광교산 체크포인트 26곳.
 *
 *  좌표 산출 방법 (2026-10-21)
 *   1) 기획 지도 이미지에서 배점별 색 마커 26개를 픽셀 단위로 자동 검출
 *   2) OSM 실측 봉우리(백운산 567m · 광교산 시루봉 582m)를 기준점으로
 *      픽셀 → 위경도 변환식을 최소제곱으로 추정
 *   3) OSM 등산로 17,241개 정점에 스냅해 보정
 *      → 등산로까지 거리 중앙값 31m, 기준점 오차 45~88m
 *
 *  ⚠️ 표시용 근사 좌표예요. GPS 도착 판정(반경 25m)에 쓰려면
 *     답사에서 실측하거나 지도 만들기 에디터에서 직접 찍어 확정해야 해요.
 */

export type ScoreTier = 10 | 20 | 30 | 40 | 50

export type CheckPoint = {
  name: string
  points: ScoreTier
  lng: number
  lat: number
}

/** 배점별 색 — 지도 마커와 범례가 공유해요.
 *  차분한 톤으로 낮은 점수(차가움) → 정상(빨강, 뜨거움) 온도 그라데이션. */
export const TIER_COLOR: Record<ScoreTier, string> = {
  10: "#6B9E78", // 세이지 그린 — 초입
  20: "#4C7FA4", // 스틸 블루 — 산중
  30: "#D9A441", // 골든 앰버 — 능선
  40: "#7E4D9E", // 플럼 퍼플 — 주요 봉우리
  50: "#CE2B37", // 크림슨 — 정상
}

export const TIERS: ScoreTier[] = [10, 20, 30, 40, 50]

/** 출발 · 도착 — 광교산 산림욕장 */
export const START: { name: string; lng: number; lat: number } | null = {
  name: "광교산 산림욕장",
  lng: 127.020730,
  lat: 37.307128,
}

export const CPS: CheckPoint[] = [
  { name: "백운산", points: 50, lng: 127.017842, lat: 37.353122 },
  { name: "CP2", points: 30, lng: 127.024306, lat: 37.349161 },
  { name: "CP3", points: 40, lng: 127.012959, lat: 37.348156 },
  { name: "광교산 시루봉", points: 40, lng: 127.034002, lat: 37.345141 },
  { name: "CP5", points: 20, lng: 127.023687, lat: 37.343072 },
  { name: "CP6", points: 30, lng: 127.009934, lat: 37.342363 },
  { name: "CP7", points: 20, lng: 127.038816, lat: 37.342363 },
  { name: "CP8", points: 20, lng: 127.015091, lat: 37.340707 },
  { name: "CP9", points: 40, lng: 127.006014, lat: 37.337751 },
  { name: "CP10", points: 30, lng: 127.021143, lat: 37.337751 },
  { name: "CP11", points: 30, lng: 127.037784, lat: 37.336865 },
  { name: "비로봉", points: 30, lng: 127.031251, lat: 37.336451 },
  { name: "CP13", points: 50, lng: 127.017704, lat: 37.334086 },
  { name: "CP14", points: 30, lng: 127.041704, lat: 37.333790 },
  { name: "CP15", points: 50, lng: 127.049062, lat: 37.333436 },
  { name: "CP16", points: 20, lng: 127.027607, lat: 37.333022 },
  { name: "CP17", points: 20, lng: 127.035721, lat: 37.330657 },
  { name: "CP18", points: 30, lng: 127.002988, lat: 37.330066 },
  { name: "CP19", points: 30, lng: 127.025956, lat: 37.328411 },
  { name: "형제봉", points: 30, lng: 127.037234, lat: 37.327701 },
  { name: "CP21", points: 20, lng: 127.004914, lat: 37.323208 },
  { name: "CP22", points: 20, lng: 127.038953, lat: 37.319425 },
  { name: "CP23", points: 10, lng: 127.010415, lat: 37.317947 },
  { name: "CP24", points: 20, lng: 127.035034, lat: 37.315878 },
  { name: "CP25", points: 20, lng: 127.002507, lat: 37.314282 },
  { name: "CP26", points: 10, lng: 127.033314, lat: 37.310853 },
]

/** 코스 요약 */
export const COURSE = {
  cpCount: 26,
  timeLimitHours: 4,
  startName: "광교산 산림욕장",
  giftThreshold: 300,
} as const

export function totalPoints(): number {
  return CPS.reduce((a, c) => a + c.points, 0)
}
