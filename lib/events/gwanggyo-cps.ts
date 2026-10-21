/** 낯선곳으로 — 광교산 체크포인트 데이터.
 *
 *  좌표가 채워지면 이벤트 페이지가 이미지 대신 Mapbox 지도로 자동 전환돼요
 *  (CPS.length === 0 이면 public/events/course.jpg 를 보여줘요).
 *
 *  채우는 방법
 *   1) 답사 GPX / 좌표 목록을 받아 아래 배열에 넣기
 *   2) 또는 hilly_po 지도 만들기로 스탬프지도를 만든 뒤 DB에서 읽기 (추후)
 */

export type ScoreTier = 10 | 20 | 30 | 40 | 50

export type CheckPoint = {
  /** 표시 이름 (예: 시루봉) */
  name: string
  /** 배점 */
  points: ScoreTier
  lng: number
  lat: number
}

/** 배점별 색 — 지도 마커와 범례가 공유해요. */
export const TIER_COLOR: Record<ScoreTier, string> = {
  10: "#22c55e",
  20: "#3b82f6",
  30: "#f59e0b",
  40: "#ef4444",
  50: "#a855f7",
}

export const TIERS: ScoreTier[] = [10, 20, 30, 40, 50]

/** 출발/도착 — 광교산 산림욕장 */
export const START: { name: string; lng: number; lat: number } | null = null

/** 체크포인트 26곳 — 좌표 확정 후 채워주세요. */
export const CPS: CheckPoint[] = []

/** 코스 요약 (좌표 없이도 페이지에 표시하는 값) */
export const COURSE = {
  cpCount: 26,
  timeLimitHours: 4,
  startName: "광교산 산림욕장",
  totalPoints: 640, // 26개 CP 배점 합 — 좌표 확정 시 CPS 로 자동 계산
} as const

export function totalPoints(): number {
  return CPS.length > 0
    ? CPS.reduce((a, c) => a + c.points, 0)
    : COURSE.totalPoints
}
