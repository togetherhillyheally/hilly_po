/**
 * Mapbox style 의 모든 symbol 라벨을 한국어 우선으로 변경.
 * Mapbox vector tile 에는 `name_ko` 필드가 있어 한국 지역명을 그대로 보여줌.
 * 한국어 라벨이 없는 곳은 기본 `name` (보통 영문) 으로 fallback.
 *
 * 사용:
 *   map.on("load", () => {
 *     applyKoreanLabels(map);
 *   });
 *   // 스타일이 동적으로 다시 로드될 때도 안전하게:
 *   map.on("style.load", () => applyKoreanLabels(map));
 */
import type { Map as MapboxMap } from "mapbox-gl";

export function applyKoreanLabels(map: MapboxMap): void {
  const style = map.getStyle();
  if (!style || !style.layers) return;
  for (const layer of style.layers) {
    if (layer.type !== "symbol") continue;
    const layout = layer.layout as { "text-field"?: unknown } | undefined;
    if (!layout || layout["text-field"] === undefined) continue;
    try {
      map.setLayoutProperty(layer.id, "text-field", [
        "coalesce",
        ["get", "name_ko"],
        ["get", "name"],
      ]);
    } catch {
      // 일부 레이어는 setLayoutProperty 실패 가능 — 무시
    }
  }
}
