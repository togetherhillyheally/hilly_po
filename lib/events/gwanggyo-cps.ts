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

// 좌표는 비공개 — 실제 위치는 행사 시작 5분 뒤 서버(event_course_points)가 공개한다.
// 여기는 배점 구성(개수·총점 계산)용 목록만 유지 — 번들에 실좌표를 싣지 않는다.
export const CPS: CheckPoint[] = [
  { name: "CP1", points: 50, lng: 0, lat: 0 },
  { name: "CP2", points: 30, lng: 0, lat: 0 },
  { name: "CP3", points: 40, lng: 0, lat: 0 },
  { name: "CP4", points: 40, lng: 0, lat: 0 },
  { name: "CP5", points: 20, lng: 0, lat: 0 },
  { name: "CP6", points: 30, lng: 0, lat: 0 },
  { name: "CP7", points: 20, lng: 0, lat: 0 },
  { name: "CP8", points: 20, lng: 0, lat: 0 },
  { name: "CP9", points: 40, lng: 0, lat: 0 },
  { name: "CP10", points: 30, lng: 0, lat: 0 },
  { name: "CP11", points: 30, lng: 0, lat: 0 },
  { name: "CP12", points: 30, lng: 0, lat: 0 },
  { name: "CP13", points: 50, lng: 0, lat: 0 },
  { name: "CP14", points: 30, lng: 0, lat: 0 },
  { name: "CP15", points: 50, lng: 0, lat: 0 },
  { name: "CP16", points: 20, lng: 0, lat: 0 },
  { name: "CP17", points: 20, lng: 0, lat: 0 },
  { name: "CP18", points: 30, lng: 0, lat: 0 },
  { name: "CP19", points: 30, lng: 0, lat: 0 },
  { name: "CP20", points: 30, lng: 0, lat: 0 },
  { name: "CP21", points: 20, lng: 0, lat: 0 },
  { name: "CP22", points: 20, lng: 0, lat: 0 },
  { name: "CP23", points: 10, lng: 0, lat: 0 },
  { name: "CP24", points: 20, lng: 0, lat: 0 },
  { name: "CP25", points: 20, lng: 0, lat: 0 },
  { name: "CP26", points: 10, lng: 0, lat: 0 },
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
