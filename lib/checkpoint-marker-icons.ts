// 체크포인트 마커 아이콘 — lucide-static v0.469.0 (ISC) path 데이터.
// 앱(TrailMapScreen MARKER_ACCENTS)과 동일한 ionicons 이름 → 색 매핑.
// 캔버스에서 Path2D 로 stroke (24×24 viewBox, strokeWidth 2, round cap/join).

export type MarkerIcon = { paths: string[]; color: string };

export const CHECKPOINT_MARKER_ICONS: Record<string, MarkerIcon> = {
  "flag-outline": { color: "#DC2F55", paths: ["M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z", "M4 22L4 15"] },
  "camera-outline": { color: "#7C3AED", paths: ["M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z", "M9.0 13.0a3.0 3.0 0 1 0 6.0 0a3.0 3.0 0 1 0 -6.0 0"] },
  "water-outline": { color: "#0284C7", paths: ["M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"] },
  "leaf-outline": { color: "#059669", paths: ["M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z", "M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"] },
  "alert-outline": { color: "#DC2626", paths: ["M2.0 12.0a10.0 10.0 0 1 0 20.0 0a10.0 10.0 0 1 0 -20.0 0", "M12 8L12 12", "M12 16L12.01 16"] },
  "warning-outline": { color: "#D97706", paths: ["m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3", "M12 9v4", "M12 17h.01"] },
  "cafe-outline": { color: "#A16207", paths: ["M10 2v2", "M14 2v2", "M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1", "M6 2v2"] },
  "restaurant-outline": { color: "#EA580C", paths: ["M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2", "M7 2v20", "M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"] },
  "bonfire-outline": { color: "#E11D48", paths: ["M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"] },
  "navigate-outline": { color: "#0891B2", paths: ["M3 11L22 2L13 21L11 13L3 11z"] },
  "bed-outline": { color: "#1E40AF", paths: ["M2 4v16", "M2 8h18a2 2 0 0 1 2 2v10", "M2 17h20", "M6 8v9"] },
  "home-outline": { color: "#16A34A", paths: ["M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8", "M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"] },
  // 화장실 — 남녀 표지판 픽토그램 (앱은 MCI human-male-female, 웹은 수제 stick figure)
  restroom: { color: "#2563EB", paths: [
    // 남 (왼쪽): 머리 / 몸통 / 팔 / 다리
    "M5.6 4.6a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0 -2.8 0",
    "M7 7.5v6",
    "M4.4 9.2h5.2",
    "m7 13.5-1.8 6",
    "m7 13.5 1.8 6",
    // 구분선
    "M12 3.5v17",
    // 여 (오른쪽): 머리 / 팔 / 치마 / 다리
    "M15.6 4.6a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0 -2.8 0",
    "M14.4 9.2h5.2",
    "M17 7.5l-2.2 7h4.4z",
    "M16.1 14.5v5",
    "M17.9 14.5v5",
  ] },
  "car-outline": { color: "#52525B", paths: ["M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2", "M5.0 17.0a2.0 2.0 0 1 0 4.0 0a2.0 2.0 0 1 0 -4.0 0", "M9 17h6", "M15.0 17.0a2.0 2.0 0 1 0 4.0 0a2.0 2.0 0 1 0 -4.0 0"] },
  "business-outline": { color: "#4F46E5", paths: ["M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z", "M9 22v-4h6v4", "M8 6h.01", "M16 6h.01", "M12 6h.01", "M12 10h.01", "M12 14h.01", "M16 10h.01", "M16 14h.01", "M8 10h.01", "M8 14h.01"] },
};

export const DEFAULT_MARKER_ICON: MarkerIcon = CHECKPOINT_MARKER_ICONS["flag-outline"];
