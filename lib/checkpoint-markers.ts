/**
 * 체크포인트 마커 아이콘/색상.
 * hilly_rn/app/screens/trail/TrailMapScreen.tsx 의 MARKER_ACCENTS 와 값 동기화 —
 * marker_icon DB 값은 Ionicons 이름 문자열이고, 웹에서는 lucide 아이콘으로 매핑해 렌더링한다
 * (lib/stamp-pool.ts 와 같은 방식).
 */

import {
  Bed,
  Building2,
  Camera,
  Car,
  CircleAlert,
  Coffee,
  Compass,
  Droplet,
  Flag,
  Flame,
  House,
  Leaf,
  TriangleAlert,
  Users,
  Utensils,
  type LucideIcon,
} from "lucide-react"

export interface CheckpointMarkerEntry {
  /** Ionicons 이름 (hilly_rn 호환 — DB marker_icon 값) */
  icon: string
  /** hilly_rn MARKER_ACCENTS 와 동일한 강조색 */
  accent: string
  /** 아이콘 선택 UI 라벨 */
  name: string
  Icon: LucideIcon
}

export const CHECKPOINT_MARKERS: CheckpointMarkerEntry[] = [
  { icon: "flag-outline", accent: "#DC2F55", name: "깃발", Icon: Flag },
  { icon: "camera-outline", accent: "#7C3AED", name: "사진 명소", Icon: Camera },
  { icon: "water-outline", accent: "#0284C7", name: "식수", Icon: Droplet },
  { icon: "leaf-outline", accent: "#059669", name: "자연", Icon: Leaf },
  { icon: "alert-outline", accent: "#DC2626", name: "위험", Icon: CircleAlert },
  { icon: "warning-outline", accent: "#D97706", name: "주의", Icon: TriangleAlert },
  { icon: "cafe-outline", accent: "#A16207", name: "카페", Icon: Coffee },
  { icon: "restaurant-outline", accent: "#EA580C", name: "식당", Icon: Utensils },
  { icon: "bonfire-outline", accent: "#E11D48", name: "모닥불", Icon: Flame },
  { icon: "navigate-outline", accent: "#0891B2", name: "갈림길", Icon: Compass },
  { icon: "bed-outline", accent: "#1E40AF", name: "숙소", Icon: Bed },
  { icon: "home-outline", accent: "#16A34A", name: "대피소", Icon: House },
  { icon: "restroom", accent: "#2563EB", name: "화장실", Icon: Users },
  { icon: "car-outline", accent: "#52525B", name: "도로", Icon: Car },
  { icon: "business-outline", accent: "#4F46E5", name: "빌딩", Icon: Building2 },
]

/** 마커 비선택 상태 배경 (hilly_rn MARKER_BG 동일) */
export const CHECKPOINT_MARKER_BG = "#F4F4F5"

const BY_ICON = new Map(CHECKPOINT_MARKERS.map((m) => [m.icon, m]))

export function getMarkerEntry(
  iconName?: string | null
): CheckpointMarkerEntry {
  return BY_ICON.get(iconName ?? "") ?? CHECKPOINT_MARKERS[0]
}

/** hilly_rn getMarkerAccent 동일 — 미지정/미등록 아이콘은 브랜드 레드 */
export function getMarkerAccent(iconName?: string | null): string {
  return BY_ICON.get(iconName ?? "")?.accent ?? "#DC2F55"
}
