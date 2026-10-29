/** 웹에서 모집하는 행사 — 표시용 설정.
 *  금액·정원의 진실은 Supabase Edge Function(event-signup)에 있어요.
 *  여기 값은 화면 표기용이고, 서버가 다시 검증해요. */

export type EventInfo = {
  slug: string
  title: string
  subtitle: string
  fee: number
  capacity: number
  /** 단체 신청 최대 인원 */
  maxParty: number
  /** 이 인원수로 신청하면 10% 할인 (2인 이상) */
  discountSizes: number[]
  dateLabel: string
  timeLabel: string
  placeLabel: string
  placeSub: string
  path: string
  /** 코스 포인트를 담은 스탬프지도 trail id — 지도 만들기 에디터에서 위치 수정 가능 */
  courseTrailId?: string
  /** 이벤트 목록 카드 이미지 */
  cover?: string
  /** 목록 표시 상태 — recruiting: 모집 중, closed: 모집 마감, ended: 종료 */
  listStatus?: "recruiting" | "closed" | "ended"
}

export const NATSEONGOT: EventInfo = {
  slug: "natseongot-2026-11",
  title: "ROUTE @광교산",
  subtitle: "",
  fee: 40_000,
  maxParty: 4,
  discountSizes: [2, 3, 4],
  capacity: 32,
  dateLabel: "2026. 11. 14. (토)",
  timeLabel: "12:00 집결, 13:00 ~ 17:00 (4시간)",
  placeLabel: "경기 수원 광교산",
  placeSub: "출발과 도착은 광교산 산림욕장",
  path: "/events/route-gg-san",
  courseTrailId: "8b710f9d-2a53-4720-9c5a-da34e9375e93",
  cover: "/events/course.jpg",
  listStatus: "recruiting",
}

/** 이벤트 목록(/events) — 최신 행사가 앞. 새 행사는 여기에 추가 */
export const EVENTS: EventInfo[] = [NATSEONGOT]

/** 인원수별 가격 — 2인 이상 신청 시 1인 요금 10% 할인 (서버와 동일 규칙) */
export function partyPricing(size: number): {
  per: number
  total: number
  discounted: boolean
} {
  const discounted = NATSEONGOT.discountSizes.includes(size)
  const per = discounted ? Math.round(NATSEONGOT.fee * 0.9) : NATSEONGOT.fee
  return { per, total: per * size, discounted }
}

/** 입력 중인 전화번호에 하이픈 — 01083138230 → 010-8313-8230, 02 지역번호도 처리.
 *  서버는 숫자만 뽑아 저장하므로 표시용. */
export function formatPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11)
  if (d.startsWith("02")) {
    if (d.length <= 2) return d
    if (d.length <= 5) return `${d.slice(0, 2)}-${d.slice(2)}`
    if (d.length <= 9) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`
    return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6, 10)}`
  }
  if (d.length <= 3) return d
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`
  // 휴대폰(010 등)은 입력 중에도 3-4-4 — 자릿수가 늘 때 칸이 흔들리지 않게
  if (d.startsWith("01") && d.length >= 8)
    return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
  if (d.length <= 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
}

/** 토스 결제위젯 클라이언트 키(공개 키) — hilly_rn app.config 와 동일 정책.
 *  시크릿 키는 웹에 두지 않고 Edge Function 시크릿(TOSS_SECRET_KEY)에만 존재.
 *  prod 빌드=라이브 키 / 로컬 dev=테스트 키, env 로 덮어쓰기 가능. */
export const TOSS_CLIENT_KEY =
  process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ??
  (process.env.NODE_ENV === "production"
    ? "live_gck_Z1aOwX7K8mBnXoX4XLBQ3yQxzvNP"
    : "test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm")

/** Edge Function 호출 — 신청서 저장 / 결제 승인 (로그인 필수: 세션 토큰 전달) */
export async function callEventFn<T>(
  body: Record<string, unknown>
): Promise<T> {
  const { getSupabase } = await import("@/lib/supabase/client")
  const {
    data: { session },
  } = await getSupabase().auth.getSession()
  if (!session) throw new Error("로그인이 필요해요.")

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/event-signup`
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw new Error(data.error ?? "요청을 처리하지 못했어요.")
  return data
}
