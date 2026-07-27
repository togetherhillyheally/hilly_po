import type { Trail } from "./repos/trailTypes"

/**
 * 등록순(sort_order) 대신 "코스 진행방향" 순서로 정렬 — 각 체크포인트를
 * 트레일 경로의 최근접 점 인덱스에 매핑해 정렬(출발점=인덱스 0 기준).
 * hilly_rn TrailMapScreen 의 guideCheckpoints 정렬과 동일한 방식.
 */
export function sortCheckpointsAlongPath<
  T extends { lng: number; lat: number },
>(checkpoints: T[], coordinates: Trail["coordinates"]): T[] {
  if (checkpoints.length < 2) return checkpoints
  if (!coordinates || coordinates.length === 0) return checkpoints
  const isMulti =
    Array.isArray(coordinates[0]) && Array.isArray(coordinates[0][0])
  const path: [number, number][] = (
    isMulti
      ? (coordinates as [number, number, number?][][]).flat()
      : (coordinates as [number, number, number?][])
  ).map((c) => [c[0], c[1]])
  if (path.length === 0) return checkpoints

  return [...checkpoints]
    .map((cp) => {
      let best = 0
      let bestD = Infinity
      for (let i = 0; i < path.length; i++) {
        const dx = path[i][0] - cp.lng
        const dy = path[i][1] - cp.lat
        const d = dx * dx + dy * dy
        if (d < bestD) {
          bestD = d
          best = i
        }
      }
      return { cp, i: best }
    })
    .sort((a, b) => a.i - b.i)
    .map((x) => x.cp)
}
