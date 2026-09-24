/**
 * 트레일 세그먼트 순환 팔레트 — hilly_home/lib/trail-palette.ts 와 동일 순서.
 * segments_colored=true 인 지도의 각 LineString 세그먼트에 순환 적용.
 */
export const TRAIL_SEGMENT_PALETTE = [
  "#DC2F55", // rose (brand)
  "#F97316", // orange
  "#EAB308", // amber
  "#22C55E", // emerald
  "#0EA5E9", // sky
  "#8B5CF6", // violet
] as const

export function segmentColor(index: number): string {
  return TRAIL_SEGMENT_PALETTE[
    ((index % TRAIL_SEGMENT_PALETTE.length) + TRAIL_SEGMENT_PALETTE.length) %
      TRAIL_SEGMENT_PALETTE.length
  ]
}
