/**
 * 참가자 색 — 지도 마커·고도표 점·목록이 같은 색을 쓰도록 한곳에서 정한다.
 * 구분(카테고리)이 있는 이벤트는 구분별 색, 없으면 참가자마다 다른 색(이름 순 고정 배정).
 */
export const CATEGORY_COLORS = [
  "#3b82f6",
  "#f59e0b",
  "#10b981",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
]

/** 구분(카테고리)별 색 — 구분 없는 엔트리는 첫 색 */
export function categoryColor(
  category: string | null,
  categories: string[],
): string {
  if (!category) return CATEGORY_COLORS[0]
  const idx = categories.indexOf(category)
  return CATEGORY_COLORS[(idx < 0 ? 0 : idx) % CATEGORY_COLORS.length]
}

// entry_id → 색 순번. 폴링마다 전체 참가자로 다시 정한다 (필터로 일부만 보여도 색이 바뀌지 않게)
const entryColorIdx = new Map<string, number>()

export function registerEntryColors(
  entries: { entry_id: string; display_name: string }[],
) {
  const sorted = [...entries].sort(
    (a, b) =>
      a.display_name.localeCompare(b.display_name, "ko", { numeric: true }) ||
      a.entry_id.localeCompare(b.entry_id),
  )
  entryColorIdx.clear()
  sorted.forEach((e, i) => entryColorIdx.set(e.entry_id, i))
}

/** 참가자 색 — 구분이 없으면 참가자별, 있으면 구분별 */
export function entryColor(
  entry: { entry_id: string; category: string | null },
  categories: string[],
): string {
  if (categories.length === 0) {
    const i = entryColorIdx.get(entry.entry_id)
    if (i != null) return CATEGORY_COLORS[i % CATEGORY_COLORS.length]
  }
  return categoryColor(entry.category, categories)
}
