/** 중계 관련 Edge Function 호출 — 로그인 필수(세션 토큰 전달). callEventFn 과 같은 꼴, 함수 이름만 바꿔 쓴다 */
export async function callBroadcastFn<T>(
  fn: "broadcast-sponsor" | "livekit-token",
  body: Record<string, unknown>,
): Promise<T> {
  const { getSupabase } = await import("@/lib/supabase/client")
  const {
    data: { session },
  } = await getSupabase().auth.getSession()
  if (!session) throw new Error("로그인이 필요해요.")

  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${fn}`, {
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
