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
export const STALE_MS = 180_000 // 3분 무신호 = '신호 없음' (기본값 · 기기별 기준의 최솟값)
const STALE_MAX_MS = 30 * 60_000
const STALE_INTERVAL_FACTOR = 2.5

/**
 * 기기별 '신호 없음' 기준 — 최근 전송 간격(중앙값)의 2.5배, 최소 3분 · 최대 30분.
 * 전송 간격을 늘린 기기(배터리 절약)가 다음 위치를 기다리는 사이 '신호 없음'으로 깜빡이지 않게.
 * 꼬리(최근 위치들)로 간격을 잰다 — 위치가 2개 미만이면 기본값.
 */
export function staleMsByEntry(
  points: { entry_id: string; recorded_at: string }[],
): Map<string, number> {
  const times = new Map<string, number[]>()
  for (const p of points) {
    const t = new Date(p.recorded_at).getTime()
    if (!Number.isFinite(t)) continue
    const arr = times.get(p.entry_id)
    if (arr) arr.push(t)
    else times.set(p.entry_id, [t])
  }
  const out = new Map<string, number>()
  for (const [id, arr] of times) {
    arr.sort((a, b) => a - b)
    // 같은 시각 중복·몇 초 차 재전송은 간격에서 뺀다. 최근 10개 간격만
    const gaps: number[] = []
    for (let i = 1; i < arr.length; i++) {
      const g = arr[i] - arr[i - 1]
      if (g >= 5_000) gaps.push(g)
    }
    const recent = gaps.slice(-10).sort((a, b) => a - b)
    if (recent.length === 0) continue
    const median = recent[Math.floor(recent.length / 2)]
    out.set(
      id,
      Math.min(STALE_MAX_MS, Math.max(STALE_MS, median * STALE_INTERVAL_FACTOR)),
    )
  }
  return out
}

/** 배터리 잔량 % — 기기가 %로 보고하면 그대로, 아니면 리튬셀 대략치(3500mV=0% ~ 4200mV=100%) */
export function batteryPercentOf(entry: LiveEntry): number | null {
  if (entry.battery_pct != null) return entry.battery_pct
  if (entry.battery_mv == null) return null
  return Math.min(100, Math.max(0, Math.round(((entry.battery_mv - 3500) / 700) * 100)))
}

/** GPS 대기 — 기기 신호는 최근에 들어오는데 쓸 만한 위치(fix)가 없음 (실내·하늘 가림 등) */
export function isGpsWaiting(
  entry: LiveEntry,
  now = Date.now(),
  staleMs = STALE_MS,
): boolean {
  const seen = entry.device_last_seen_at
    ? new Date(entry.device_last_seen_at).getTime()
    : 0
  if (!seen || now - seen > staleMs) return false
  const fixMs = entry.recorded_at ? new Date(entry.recorded_at).getTime() : 0
  return entry.lat == null || entry.lng == null || now - fixMs > staleMs
}

/** 고도표용 코스 인덱스 — 여러 구간이면 이어 붙여 전체 코스로 (진행률 계산엔 쓰지 않음) */
export function buildProfileIndex(
  coordinates: Coordinates | null | undefined,
): CourseIndex | null {
  if (!coordinates || coordinates.length === 0) return null
  const isMulti =
    Array.isArray(coordinates[0]) &&
    Array.isArray((coordinates[0] as unknown[])[0])
  const flat = isMulti
    ? (coordinates as unknown as Coord[][]).flat()
    : (coordinates as unknown as Coord[])
  return buildCourseIndex(flat as unknown as Coordinates)
}
export const STATIONARY_THRESHOLD_SEC = 1800 // 30분 이상 같은 자리 = '장시간 정지'
export const STATIONARY_MOVE_M = 30 // 이 거리 이상 벗어나야 '이동'으로 간주
export const LOW_BATTERY_MV = 3600 // MT710 3.6V 미만 = 배터리 부족

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
    // 세그먼트 일부만 범위에 걸치면 범위 안쪽으로만 투영 (범위 밖 진행거리로 잡히지 않게)
    const segM = cum[i + 1] - cum[i]
    const tLo = segM > 0 ? Math.max(0, (fromM - cum[i]) / segM) : 0
    const tHi = segM > 0 ? Math.min(1, (toM - cum[i]) / segM) : 1
    const tRaw = len2 === 0 ? 0 : -(ax * dx + ay * dy) / len2
    const t = Math.min(tHi, Math.max(tLo, tRaw))
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

/** 코스 위 체크포인트 — 진행거리(m)로 환산해 둔 것 (다음 CP 도착 예상용) */
export interface CheckpointMark {
  title: string
  progressM: number
}

/**
 * 체크포인트를 코스 진행거리로 환산 — 순서대로, 앞 CP 이후 구간에서만 찾는다
 * (순환·겹치는 구간에서 엉뚱한 쪽으로 잡히지 않게). 코스에서 300m 넘게 떨어진 CP 는 뺀다.
 */
export function buildCheckpointMarks(
  index: CourseIndex,
  checkpoints: { title: string; lat: number; lng: number; sort_order: number }[],
): CheckpointMark[] {
  const marks: CheckpointMark[] = []
  let fromM = 0
  for (const cp of [...checkpoints].sort((a, b) => a.sort_order - b.sort_order)) {
    const p = projectOnRange(index, cp.lat, cp.lng, fromM, index.totalM)
    if (!p || p.crossTrackM > 300) continue
    marks.push({ title: cp.title, progressM: p.progressM })
    fromM = p.progressM
  }
  return marks
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
  /** 첫 위치(직전 기록 없음)일 때 갈 수 있었던 최대 거리 — 출발·도착이 같은 순환 코스에서
   *  출발 지점이 도착(끝 km)으로 잡히는 것을 막는다. 없으면 전체 탐색 */
  maxPlausibleM?: number,
): ProgressResult {
  // 1) 직전 진행거리 주변 윈도우 우선 탐색
  let proj: Projection | null = null
  if (!prev && maxPlausibleM != null && maxPlausibleM < index.totalM) {
    const early = projectOnRange(index, lat, lng, 0, maxPlausibleM)
    if (early && early.crossTrackM <= OFF_COURSE_M) proj = early
  }
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
  /** 다음 체크포인트와 평균 페이스 기반 도착 예상 시각 — CP 가 남아 있지 않으면 null (그땐 etaAt = 결승) */
  nextCp: { title: string; etaAt: number | null } | null
  /** 코스 프로필 기반 현재 해발고도(m) — 코스/고도 데이터 없으면 null */
  altitudeM: number | null
  /** 여기까지의 누적 상승(m) — 코스/고도 데이터 없으면 null */
  ascentM: number | null
  /** 결승점 도착 여부 (코스 끝 30m 이내 도달) — 도착 후 신호가 끊겨도 유지 */
  finished: boolean
  status: LiveStatus
  /** 이 기기의 '신호 없음' 기준(ms) — 전송 간격에 맞춤 (staleMsByEntry) */
  staleMs: number
  /** 같은 자리(30m 반경)에 머문 시간(초) — 판정 불가면 null */
  stationarySec: number | null
  /** 최근 24시간 누적 이동거리(km) — 관리자 응답에만 있음 */
  distance24hKm: number | null
  /** 배터리 부족 (3.6V 미만, 관리자 응답 전용) */
  lowBattery: boolean
  /** 이벤트 스탬프 게임 점수 — 스탬프지도 연결 이벤트에서만 (훅이 주입) */
  gameScore?: number | null
  /** 찍은 스탬프 수 */
  stampCount?: number
}

/** 클라이언트 정지 감지용 앵커 — 폴링 간 유지 (훅이 ref 로 보관) */
export interface MovementAnchor {
  lat: number
  lng: number
  since: number
}

/** 모니터(상시 관제) 정렬용 심각도 — 낮을수록 위험 (SOS > 신호없음 > 장시간 정지 > 배터리 부족 > 정상) */
export function monitorSeverity(r: RankedEntry): number {
  if (r.status === "sos") return 0
  if (r.status === "noSignal" || r.status === "stale") return 1
  if (r.stationarySec != null && r.stationarySec >= STATIONARY_THRESHOLD_SEC)
    return 2
  if (r.lowBattery) return 3
  return 4
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
  /** 서버 last_moved_at 이 없는 응답(관전/모험)의 클라이언트 정지 감지 앵커 */
  movementMap?: Map<string, MovementAnchor>,
  /** 코스 위 체크포인트 (buildCheckpointMarks) — 있으면 다음 CP 도착 예상 계산 */
  checkpointMarks?: CheckpointMark[],
  /** 기기별 '신호 없음' 기준 (staleMsByEntry) — 없으면 3분 */
  staleMsMap?: Map<string, number>,
): RankedEntry[] {
  const ranked: RankedEntry[] = entries.map((entry) => {
    const hasFix = entry.lat != null && entry.lng != null && entry.recorded_at
    const recordedMs = entry.recorded_at
      ? new Date(entry.recorded_at).getTime()
      : 0
    const staleMs = staleMsMap?.get(entry.entry_id) ?? STALE_MS
    const stale = !hasFix || now - recordedMs > staleMs

    let progressM: number | null = null
    let offCourse = false
    if (courseIndex && hasFix) {
      // 첫 위치는 출발 후 경과 시간으로 갈 수 있는 거리 안에서만 찾는다 (최대 시속 18km 가정, 최소 3km)
      const maxPlausibleM =
        startsAtMs != null
          ? Math.max(3000, (((recordedMs ?? now) - startsAtMs) / 1000) * 5)
          : undefined
      const r = projectProgress(
        courseIndex,
        entry.lat as number,
        entry.lng as number,
        prevMap.get(entry.entry_id),
        maxPlausibleM,
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
    let avgMps: number | null = null
    if (
      courseIndex &&
      startsAtMs &&
      progressM != null &&
      status === "ok" &&
      progressM > 100 &&
      now - startsAtMs > 120_000 &&
      progressM < courseIndex.totalM
    ) {
      const mps = progressM / ((now - startsAtMs) / 1000)
      if (mps > 0.2) {
        avgMps = mps
        etaAt = now + ((courseIndex.totalM - progressM) / mps) * 1000
      }
    }
    // 다음 CP — 지금 위치보다 50m 이상 앞에 있는 첫 CP (CP 에 머무는 동안은 다음 CP 로 넘기지 않음)
    const nextMark =
      progressM != null
        ? checkpointMarks?.find((m) => m.progressM > progressM! + 50)
        : undefined
    const nextCp = nextMark
      ? {
          title: nextMark.title,
          etaAt:
            avgMps != null
              ? now + ((nextMark.progressM - progressM!) / avgMps) * 1000
              : null,
        }
      : null

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

    // 정지 시간 — 서버 값(last_moved_at) 우선, 없으면 클라이언트 앵커로 판정
    let stationarySec: number | null = null
    if (hasFix && !stale) {
      if ("last_moved_at" in entry) {
        stationarySec = entry.last_moved_at
          ? Math.max(0, (now - new Date(entry.last_moved_at).getTime()) / 1000)
          : 86_400 // 24시간 창 안에서 한 번도 30m 이상 못 벗어남
      } else if (movementMap) {
        const anchor = movementMap.get(entry.entry_id)
        const lat = entry.lat as number
        const lng = entry.lng as number
        if (
          !anchor ||
          haversineMeters(anchor.lat, anchor.lng, lat, lng) > STATIONARY_MOVE_M
        ) {
          movementMap.set(entry.entry_id, { lat, lng, since: now })
          stationarySec = 0
        } else {
          stationarySec = (now - anchor.since) / 1000
        }
      }
    }

    const rawDist = entry.distance_24h_km
    const distance24hKm =
      rawDist == null || rawDist === "" ? null : Number(rawDist)
    const lowBattery =
      entry.battery_pct != null
        ? entry.battery_pct <= 20
        : entry.battery_mv != null && entry.battery_mv < LOW_BATTERY_MV

    return {
      entry,
      progressM,
      rank: null,
      categoryRank: null,
      gapM: null,
      gapSec: null,
      etaAt,
      nextCp,
      altitudeM,
      ascentM,
      finished,
      status,
      staleMs,
      stationarySec,
      distance24hKm: Number.isFinite(distance24hKm as number)
        ? distance24hKm
        : null,
      lowBattery,
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

/** 예상 시각 "14:20" — 오늘이 아니면 "내일 02:10" (그 뒤는 "11/1 02:10") */
export function formatEtaClock(etaAt: number, now = Date.now()): string {
  const d = new Date(etaAt)
  const pad = (n: number) => String(n).padStart(2, "0")
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  const day = (t: Date) => new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime()
  const diff = Math.round((day(d) - day(new Date(now))) / 86_400_000)
  if (diff <= 0) return hm
  if (diff === 1) return `내일 ${hm}`
  return `${d.getMonth() + 1}/${d.getDate()} ${hm}`
}

/** 다음 CP(없으면 결승) 도착 예상 — { 어디, 언제 }. 계산 불가·도착자는 null */
export function nextEta(r: RankedEntry): { where: string; when: string } | null {
  if (r.finished) return null
  if (r.nextCp) {
    if (r.nextCp.etaAt == null) return null
    return { where: r.nextCp.title, when: formatEtaClock(r.nextCp.etaAt) }
  }
  if (r.etaAt == null) return null
  return { where: "결승", when: formatEtaClock(r.etaAt) }
}

export function formatGap(gapM: number | null): string {
  if (gapM == null) return "—"
  if (gapM < 1) return "—" // 동률(격차 0)
  if (gapM < 1000) return `+${Math.round(gapM)}m`
  return `+${(gapM / 1000).toFixed(1)}km`
}

/** 정지 시간 라벨 — 임계(30분) 미만이면 null */
export function formatStationary(sec: number | null): string | null {
  if (sec == null || sec < STATIONARY_THRESHOLD_SEC) return null
  const min = Math.floor(sec / 60)
  if (min < 60) return `정지 ${min}분`
  if (sec >= 86_400) return "정지 24시간+"
  return `정지 ${Math.floor(min / 60)}시간 ${min % 60 > 0 ? `${min % 60}분` : ""}`.trim()
}

export function formatGapTime(gapSec: number | null): string | null {
  if (gapSec == null || gapSec < 30) return null
  const min = Math.round(gapSec / 60)
  if (min < 1) return null
  if (min < 60) return `≈ +${min}분`
  return `≈ +${Math.floor(min / 60)}시간 ${min % 60}분`
}
