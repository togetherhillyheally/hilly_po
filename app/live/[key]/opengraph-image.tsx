import { fetchTrailThumbUrl, LIVE_CARD_SIZE, liveCardImage } from "@/lib/og/live-card"

/** 개인 도전 중계 공유 미리보기 — 제목 · 호스트 · 코스 · LIVE/종료 (그리기는 lib/og/live-card) */
export const alt = "힐리힐리 LIVE 중계"
export const size = LIVE_CARD_SIZE
export const contentType = "image/png"
export const revalidate = 60

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

type B = {
  title?: string
  status?: string
  started_at?: string
  trail_id?: string | null
  host?: { nickname?: string | null } | null
}

async function fetchBroadcast(key: string): Promise<B | null> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/public_broadcast_by_key`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` },
    body: JSON.stringify({ p_key: key }),
    next: { revalidate: 60 },
  })
  return res.ok ? ((await res.json()) as B | null) : null
}

async function fetchTrailName(trailId: string): Promise<{ name: string; distance_km: number | null } | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/trails?id=eq.${trailId}&select=name,distance_km`, {
      headers: { apikey: ANON },
      next: { revalidate: 300 },
    })
    if (!res.ok) return null
    const rows = (await res.json()) as { name: string; distance_km: number | null }[]
    return rows[0] ?? null
  } catch {
    return null
  }
}

export default async function Image({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params
  const b = await fetchBroadcast(decodeURIComponent(key)).catch(() => null)
  const [thumb, trail] = b?.trail_id
    ? await Promise.all([fetchTrailThumbUrl(b.trail_id), fetchTrailName(b.trail_id)])
    : [null, null]
  const who = b?.host?.nickname ? `${b.host.nickname}의 도전` : null
  return liveCardImage({
    title: b?.title ?? "힐리힐리 LIVE",
    subtitle: [
      who,
      trail?.name ?? null,
      trail?.distance_km != null ? `${Number(trail.distance_km).toFixed(1)}km` : null,
    ],
    when: b?.status === "ended" ? "중계 종료" : "LIVE 중계 중",
    tagline: b?.status === "ended" ? "기록과 응원을 볼 수 있어요" : "실시간 위치를 보며 응원해요",
    thumbUrl: thumb,
  })
}
