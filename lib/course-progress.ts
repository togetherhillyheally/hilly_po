/**
 * 코스 진행거리/순위 계산 — 최신 위치를 trail polyline 에 투영해 진행거리(m)를 구하고
 * 진행거리 내림차순으로 순위·선두와의 격차를 계산한다 (레이스 관제용).
 *
 * 왕복(out-and-back) 코스 가드:
 *  - 직전 진행거리 기준 [-300m, +3000m] 윈도우를 우선 탐색해 반대 구간 오매칭 방지
 *  - 진행거리는 단조 증가 — 2회 연속 확실한 후퇴일 때만 하락 수용 (실제 회귀/포기 케이스)
 */
import { haversineMeters } from "@/lib/geo"
import type { LiveEntry } from "@/lib/repos/trackerControlTypes"

const OFF_COURSE_M = 150 // 코스 이탈 판정 cross-track 거리
const WINDOW_BACK_M = 300
const WINDOW_FWD_M = 3000
const BACKTRACK_ACCEPT_COUNT = 2
export const STALE_MS = 180_000 // 3분 무신호 = '신호 없음'

type Coord = [number, number, number?]
type Coordinates = Coord[] | Coord[][]

export interface CourseIndex {
  /** [lng, lat][] */
  pts: [number, number][]
  /** 정점별 누적거리(m) */
  cum: number[]
  /** 정점별 고도(m) — GPX 에 없으면 null */
  eles: (number | null)[]
  /** 정점별 누적 상승(m) — 고도 데이터 없으면 null */
  cumAscent: number[] | null
  totalM: number
  /** 누적 상승(D+) — 고도 데이터 없으면 null */
  totalAscentM: number | null
  /** 누적 하강(D−) — 고도 데이터 없으면 null */
  totalDescentM: number | null
}

/** 멀티루트면 첫 번째 루트 기준 (v1 — parseTrailRow 의 멀티 감지와 동일 기준) */
export function buildCourseIndex(coordinates: Coordinates): CourseIndex | null {
  const isMulti =
    coordinates.length > 0 &&
    Array.isArray(coordinates[0]) &&
    Array.isArray((coordinates[0] as unknown[])[0])
  const line = (isMulti ? coordinates[0] : coordinates) as Coord[]
  if (!Array.isArray(line) || line.length < 2) return null

  const pts: [number, number][] = line.map((c) => [c[0], c[1]])
  const eles: (number | null)[] = line.map((c) =>
    typeof c[2] === "number" && Number.isFinite(c[2]) ? c[2] : null,
  )
  const cum: number[] = [0]
  const cumAscent: number[] = [0]
  let ascent = 0
  let descent = 0
  let hasEle = false
  for (let i = 1; i < pts.length; i++) {
    cum.push(
      cum[i - 1] +
        haversineMeters(pts[i - 1][1], pts[i - 1][0], pts[i][1], pts[i][0]),
    )
    const a = eles[i - 1]
    const b = eles[i]
    if (a != null && b != null) {
      hasEle = true
      if (b > a) ascent += b - a
      else descent += a - b
    }
    cumAscent.push(ascent)
  }
  return {
    pts,
    cum,
    eles,
    cumAscent: hasEle ? cumAscent : null,
    totalM: cum[cum.length - 1],
    totalAscentM: hasEle ? Math.round(ascent) : null,
    totalDescentM: hasEle ? Math.round(descent) : null,
  }
}

/** 진행거리 d 까지의 누적 상승(m) — 고도 데이터 없으면 null */
export function courseAscentAt(index: CourseIndex, d: number): number | null {
  const asc = index.cumAscent
  if (!asc) return null
  const { cum } = index
  if (d <= 0) return 0
  if (d >= index.totalM) return asc[asc.length - 1]
  let lo = 0
  let hi = cum.length - 1
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1
    if (cum[mid] <= d) lo = mid
    else hi = mid
  }
  const seg = cum[hi] - cum[lo]
  const t = seg > 0 ? (d - cum[lo]) / seg : 0
  return asc[lo] + (asc[hi] - asc[lo]) * t
}

/** 진행거리 d 지점의 코스 고도를 선형 보간 (고도 데이터 없으면 null) */
export function courseEleAt(index: CourseIndex, d: number): number | null {
  const { cum, eles } = index
  if (d <= 0) return eles[0]
  if (d >= index.totalM) return eles[eles.length - 1]
  let lo = 0
  let hi = cum.length - 1
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1
    if (cum[mid] <= d) lo = mid
    else hi = mid
  }
  const a = eles[lo]
  const b = eles[hi]
  if (a == null || b == null) return a ?? b
  const seg = cum[hi] - cum[lo]
  const t = seg > 0 ? (d - cum[lo]) / seg : 0
  return a + (b - a) * t
}

interface Projection {
  progressM: number
  crossTrackM: number
}

/** 임의 좌표(체크포인트 등)를 코스 전체에서 투영 — 진행거리/이탈거리 반환 */
export function projectPointOnCourse(
  index: CourseIndex,
  lat: number,
  lng: number,
): Projection | null {
  return projectOnRange(index, lat, lng, 0, index.totalM)
}

/** 로컬 equirectangular 평면에서 최근접 세그먼트에 투영 */
function projectOnRange(
  index: CourseIndex,
  lat: number,
  lng: number,
  fromM: number,
  toM: number,
): Projection | null {
  const mPerDegLat = 110_540
  const mPerDegLng = 111_320 * Math.cos((lat * Math.PI) / 180)
  const { pts, cum } = index
  let best: Projection | null = null

  for (let i = 0; i < pts.length - 1; i++) {
    if (cum[i + 1] < fromM || cum[i] > toM) continue
    const ax = (pts[i][0] - lng) * mPerDegLng
    const ay = (pts[i][1] - lat) * mPerDegLat
    const bx = (pts[i + 1][0] - lng) * mPerDegLng
    const by = (pts[i + 1][1] - lat) * mPerDegLat
    const dx = bx - ax
    const dy = by - ay
    const len2 = dx * dx + dy * dy
    const t = len2 === 0 ? 0 : Math.min(1, Math.max(0, -(ax * dx + ay * dy) / len2))
    const px = ax + t * dx
    const py = ay + t * dy
    const dist = Math.sqrt(px * px + py * py)
    if (!best || dist < best.crossTrackM) {
      best = {
        progressM: cum[i] + t * (cum[i + 1] - cum[i]),
        crossTrackM: dist,
      }
    }
  }
  return best
}

export interface ProgressState {
  progressM: number
  backCount: number
}

export interface ProgressResult {
  progressM: number
  offCourse: boolean
  next: ProgressState
}

export function projectProgress(
  index: CourseIndex,
  lat: number,
  lng: number,
  prev: ProgressState | undefined,
): ProgressResult {
  // 1) 직전 진행거리 주변 윈도우 우선 탐색
  let proj: Projection | null = null
  if (prev) {
    proj = projectOnRange(
      index,
      lat,
      lng,
      prev.progressM - WINDOW_BACK_M,
      prev.progressM + WINDOW_FWD_M,
    )
  }
  // 2) 윈도우 안에서 못 찾으면 전체 탐색
  if (!proj || proj.crossTrackM > OFF_COURSE_M) {
    const full = projectOnRange(index, lat, lng, 0, index.totalM)
    if (full && (!proj || full.crossTrackM < proj.crossTrackM)) proj = full
  }

  const prevM = prev?.progressM ?? 0
  if (!proj || proj.crossTrackM > OFF_COURSE_M) {
    // 코스 이탈 — 진행거리 유지
    return {
      progressM: prevM,
      offCourse: true,
      next: { progressM: prevM, backCount: 0 },
    }
  }

  // 단조 증가 가드 — 확실한 후퇴가 연속되면 수용 (실제 회귀)
  if (proj.progressM < prevM - WINDOW_BACK_M) {
    const backCount = (prev?.backCount ?? 0) + 1
    if (backCount >= BACKTRACK_ACCEPT_COUNT) {
      return {
        progressM: proj.progressM,
        offCourse: false,
        next: { progressM: proj.progressM, backCount: 0 },
      }
    }
    return {
      progressM: prevM,
      offCourse: false,
      next: { progressM: prevM, backCount },
    }
  }

  const progressM = Math.max(prevM, proj.progressM)
  return {
    progressM,
    offCourse: false,
    next: { progressM, backCount: 0 },
  }
}

export type LiveStatus = "ok" | "stale" | "offCourse" | "noSignal" | "sos"

export interface RankedEntry {
  entry: LiveEntry
  /** 코스 진행거리(m) — 코스 없는 모니터 모드는 null */
  progressM: number | null
  /** 전체 순위 (race 모드, 위치 있는 엔트리만) */
  rank: number | null
  /** 구분(카테고리) 내 순위 */
  categoryRank: number | null
  /** 선두와의 거리 격차(m) */
  gapM: number | null
  /** 선두 속도 기반 예상 시간 격차(초) */
  gapSec: number | null
  /** 평균 페이스 기반 예상 완주 시각(epoch ms) — 계산 불가면 null */
  etaAt: number | null
  /** 코스 프로필 기반 현재 해발고도(m) — 코스/고도 데이터 없으면 null */
  altitudeM: number | null
  /** 여기까지의 누적 상승(m) — 코스/고도 데이터 없으면 null */
  ascentM: number | null
  /** 결승점 도착 여부 (코스 끝 30m 이내 도달) — 도착 후 신호가 끊겨도 유지 */
  finished: boolean
  status: LiveStatus
}

const FINISH_THRESHOLD_M = 30

/**
 * 순위 계산. courseIndex 가 null(모니터 모드/코스 없음)이면 순위 없이 상태만 계산.
 * prevMap 은 호출 측(훅)이 폴링 간 유지하는 엔트리별 진행 상태.
 */
export function rankEntries(
  entries: LiveEntry[],
  courseIndex: CourseIndex | null,
  prevMap: Map<string, ProgressState>,
  now: number,
  /** 이벤트 시작 시각(epoch ms) — 있으면 평균 페이스로 예상 완주 시각 계산 */
  startsAtMs?: number | null,
): RankedEntry[] {
  const ranked: RankedEntry[] = entries.map((entry) => {
    const hasFix = entry.lat != null && entry.lng != null && entry.recorded_at
    const recordedMs = entry.recorded_at
      ? new Date(entry.recorded_at).getTime()
      : 0
    const stale = !hasFix || now - recordedMs > STALE_MS

    let progressM: number | null = null
    let offCourse = false
    if (courseIndex && hasFix) {
      const r = projectProgress(
        courseIndex,
        entry.lat as number,
        entry.lng as number,
        prevMap.get(entry.entry_id),
      )
      prevMap.set(entry.entry_id, r.next)
      progressM = r.progressM
      offCourse = r.offCourse
    } else if (courseIndex) {
      progressM = prevMap.get(entry.entry_id)?.progressM ?? null
    }

    const status: LiveStatus = entry.sos_at
      ? "sos"
      : !hasFix
        ? "noSignal"
        : stale
          ? "stale"
          : offCourse
            ? "offCourse"
            : "ok"

    // 평균 페이스(진행거리/경과시간) 기반 예상 완주 시각 — 초반/정지 상태는 제외
    let etaAt: number | null = null
    if (
      courseIndex &&
      startsAtMs &&
      progressM != null &&
      status === "ok" &&
      progressM > 100 &&
      now - startsAtMs > 120_000 &&
      progressM < courseIndex.totalM
    ) {
      const avgMps = progressM / ((now - startsAtMs) / 1000)
      if (avgMps > 0.2) {
        etaAt = now + ((courseIndex.totalM - progressM) / avgMps) * 1000
      }
    }

    const altitudeM =
      courseIndex && progressM != null && courseIndex.totalAscentM != null
        ? courseEleAt(courseIndex, progressM)
        : null
    const ascentM =
      courseIndex && progressM != null
        ? courseAscentAt(courseIndex, progressM)
        : null
    const finished =
      courseIndex != null &&
      progressM != null &&
      progressM >= courseIndex.totalM - FINISH_THRESHOLD_M

    return {
      entry,
      progressM,
      rank: null,
      categoryRank: null,
      gapM: null,
      gapSec: null,
      etaAt,
      altitudeM,
      ascentM,
      finished,
      status,
    }
  })

  if (!courseIndex) return ranked

  // 진행거리 내림차순 순위 (진행거리 없는 엔트리는 순위 밖)
  const withProgress = ranked
    .filter((r) => r.progressM != null)
    .sort((a, b) => (b.progressM as number) - (a.progressM as number))
  const leader = withProgress[0]
  const leaderSpeedMps = Math.max(
    ((leader?.entry.speed_kmh ?? 0) * 1000) / 3600,
    0.3,
  )
  const categoryCounters = new Map<string, number>()
  withProgress.forEach((r, i) => {
    r.rank = i + 1
    if (leader && r !== leader) {
      r.gapM = (leader.progressM as number) - (r.progressM as number)
      r.gapSec = r.gapM / leaderSpeedMps
    } else {
      r.gapM = 0
      r.gapSec = 0
    }
    // 구분 내 순위 (전체 순위 순서대로 구분별 카운트)
    if (r.entry.category) {
      const n = (categoryCounters.get(r.entry.category) ?? 0) + 1
      categoryCounters.set(r.entry.category, n)
      r.categoryRank = n
    }
  })

  return ranked
}

export function formatGap(gapM: number | null): string {
  if (gapM == null) return "—"
  if (gapM < 1) return "—" // 동률(격차 0)
  if (gapM < 1000) return `+${Math.round(gapM)}m`
  return `+${(gapM / 1000).toFixed(1)}km`
}

export function formatGapTime(gapSec: number | null): string | null {
  if (gapSec == null || gapSec < 30) return null
  const min = Math.round(gapSec / 60)
  if (min < 1) return null
  if (min < 60) return `≈ +${min}분`
  return `≈ +${Math.floor(min / 60)}시간 ${min % 60}분`
}
