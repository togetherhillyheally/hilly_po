/** 웹에서 모집하는 행사 — 표시용 설정.
 *  금액·정원의 진실은 Supabase Edge Function(event-signup)에 있어요.
 *  여기 값은 화면 표기용이고, 서버가 다시 검증해요. */

export type EventInfo = {
  slug: string
  title: string
  subtitle: string
  fee: number
  capacity: number
  dateLabel: string
  timeLabel: string
  placeLabel: string
  placeSub: string
  path: string
}

export const NATSEONGOT: EventInfo = {
  slug: "natseongot-2026-11",
  title: "낯선곳으로",
  subtitle: "광교산 스탬프 게임",
  fee: 100_000,
  capacity: 16,
  dateLabel: "2026. 11. 14. (토)",
  timeLabel: "제한 4시간 · 일몰 전 복귀",
  placeLabel: "경기 수원 광교산",
  placeSub: "광교산 산림욕장 출발 · 도착",
  path: "/events/natseongot",
}

/** Edge Function 호출 — 신청서 저장 / 결제 승인 */
export async function callEventFn<T>(
  body: Record<string, unknown>
): Promise<T> {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/event-signup`
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw new Error(data.error ?? "요청을 처리하지 못했어요.")
  return data
}
