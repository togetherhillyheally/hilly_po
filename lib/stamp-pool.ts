/**
 * 스탬프 자동 이름 풀.
 * hilly_rn/constants/stampPool.ts 의 STAMP_POOL 을 그대로 옮기고,
 * Ionicons 아이콘 이름을 lucide-react 컴포넌트로 매핑한다.
 *
 * 저장 형식: title = "<ionicon-name>|<korean-name>" (예: "leaf-outline|잎").
 */

import {
  Leaf,
  Flower,
  Heart,
  Droplet,
  Sun,
  Moon,
  Snowflake,
  Cloud,
  CloudRain,
  PawPrint,
  Fish,
  Bug,
  Flame,
  IceCream2,
  Wind,
  Gift,
  Star,
  Sparkles,
  Telescope,
  Bike,
  Trophy,
  Medal,
  Bookmark,
  Book,
  Umbrella,
  Lightbulb,
  Key,
  Diamond,
  Pizza,
  Watch,
  Apple,
  type LucideIcon,
} from "lucide-react";

export interface StampPoolEntry {
  /** Ionicons 이름 (hilly_rn 호환 — DB title 의 prefix 로 사용) */
  icon: string;
  color: string;
  name: string;
  /** Lucide 아이콘 컴포넌트 (BO 렌더링용) */
  Icon: LucideIcon;
}

export const STAMP_POOL: StampPoolEntry[] = [
  { icon: "leaf-outline", color: "#059669", name: "잎", Icon: Leaf },
  { icon: "flower-outline", color: "#DB2777", name: "꽃", Icon: Flower },
  { icon: "rose-outline", color: "#E11D48", name: "장미", Icon: Heart },
  { icon: "water-outline", color: "#0284C7", name: "물", Icon: Droplet },
  { icon: "sunny-outline", color: "#F59E0B", name: "햇살", Icon: Sun },
  { icon: "moon-outline", color: "#7C3AED", name: "달", Icon: Moon },
  { icon: "snow-outline", color: "#06B6D4", name: "눈", Icon: Snowflake },
  { icon: "cloud-outline", color: "#6B7280", name: "구름", Icon: Cloud },
  { icon: "rainy-outline", color: "#0891B2", name: "비", Icon: CloudRain },
  { icon: "paw-outline", color: "#A16207", name: "발자국", Icon: PawPrint },
  { icon: "fish-outline", color: "#0D9488", name: "물고기", Icon: Fish },
  { icon: "bug-outline", color: "#65A30D", name: "곤충", Icon: Bug },
  { icon: "bonfire-outline", color: "#DC2626", name: "모닥불", Icon: Flame },
  { icon: "ice-cream-outline", color: "#EC4899", name: "아이스크림", Icon: IceCream2 },
  { icon: "balloon-outline", color: "#F472B6", name: "풍선", Icon: Wind },
  { icon: "gift-outline", color: "#E11D48", name: "선물", Icon: Gift },
  { icon: "star-outline", color: "#FACC15", name: "별", Icon: Star },
  { icon: "sparkles-outline", color: "#A855F7", name: "반짝", Icon: Sparkles },
  { icon: "heart-outline", color: "#EF4444", name: "하트", Icon: Heart },
  { icon: "flame-outline", color: "#F97316", name: "불꽃", Icon: Flame },
  { icon: "telescope-outline", color: "#475569", name: "망원경", Icon: Telescope },
  { icon: "bicycle-outline", color: "#BE185D", name: "자전거", Icon: Bike },
  { icon: "trophy-outline", color: "#B45309", name: "트로피", Icon: Trophy },
  { icon: "medal-outline", color: "#D97706", name: "메달", Icon: Medal },
  { icon: "ribbon-outline", color: "#C026D3", name: "리본", Icon: Bookmark },
  { icon: "book-outline", color: "#1F2937", name: "책", Icon: Book },
  { icon: "umbrella-outline", color: "#3B82F6", name: "우산", Icon: Umbrella },
  { icon: "bulb-outline", color: "#FBBF24", name: "전구", Icon: Lightbulb },
  { icon: "key-outline", color: "#B7791F", name: "열쇠", Icon: Key },
  { icon: "diamond-outline", color: "#0E7490", name: "보석", Icon: Diamond },
  { icon: "pizza-outline", color: "#84CC16", name: "피자", Icon: Pizza },
  { icon: "watch-outline", color: "#BE123C", name: "시계", Icon: Watch },
  { icon: "nutrition-outline", color: "#16A34A", name: "사과", Icon: Apple },
];

const POOL_BY_ICON = new Map(STAMP_POOL.map((e) => [e.icon, e]));

/** title("icon-name|korean-name") → entry + name */
export function parseStampTitle(title: string | null | undefined): {
  entry: StampPoolEntry | null;
  name: string;
} {
  const t = (title ?? "").trim();
  if (!t) return { entry: null, name: "" };
  const sepIdx = t.indexOf("|");
  if (sepIdx > 0) {
    const iconPart = t.slice(0, sepIdx);
    const namePart = t.slice(sepIdx + 1);
    const entry = POOL_BY_ICON.get(iconPart);
    if (entry) return { entry, name: namePart || entry.name };
  }
  return { entry: null, name: t };
}

export function stampTitleFromEntry(entry: StampPoolEntry): string {
  return `${entry.icon}|${entry.name}`;
}

/** 셔플 후 앞에서 count 개. 중복 없이 풀에서 선택. */
export function pickStampEntries(count: number, seed?: number): StampPoolEntry[] {
  const pool = [...STAMP_POOL];
  let rng: () => number;
  if (seed != null) {
    let s = seed >>> 0;
    rng = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0xffffffff;
    };
  } else {
    rng = Math.random;
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

/**
 * 이미 사용된 icon 이름 set 을 받아서, 풀에서 안 쓴 것 중 하나를 랜덤 선택.
 * 모두 쓰였으면 풀에서 다시 하나 (반복 허용).
 */
export function pickUnusedEntry(usedIcons: Set<string>): StampPoolEntry {
  const unused = STAMP_POOL.filter((e) => !usedIcons.has(e.icon));
  const arr = unused.length > 0 ? unused : STAMP_POOL;
  return arr[Math.floor(Math.random() * arr.length)];
}
