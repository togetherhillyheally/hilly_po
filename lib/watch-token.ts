/**
 * 관전 주소 /watch/<key> 의 key 해석 — 32자리 공개 토큰이면 그대로,
 * 아니면 짧은 주소(slug, 예: utnp-9peak)로 보고 토큰을 찾아온다.
 */
export const isPublicToken = (key: string) => /^[0-9a-f]{32}$/.test(key)

/** 서버(메타데이터·OG 이미지)용 — 못 찾으면 null */
export async function resolveWatchTokenServer(key: string): Promise<string | null> {
  if (isPublicToken(key)) return key
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/tracker_event_token_by_slug`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anon,
          Authorization: `Bearer ${anon}`,
        },
        body: JSON.stringify({ p_slug: decodeURIComponent(key) }),
        next: { revalidate: 60 },
      },
    )
    if (!res.ok) return null
    const token = (await res.json()) as string | null
    return token || null
  } catch {
    return null
  }
}
