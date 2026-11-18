import { fetchTrailThumbUrl, LIVE_CARD_SIZE, liveCardImage } from "@/lib/og/live-card"
import { resolveWatchTokenServer } from "@/lib/watch-token"

/**
 * 관전 링크 공유 미리보기 이미지 (카카오톡·슬랙 등 og:image).
 * 코스 썸네일을 배경으로, 이벤트 제목 · 코스/거리 · 출발 시각(또는 LIVE/종료)을 얹는다. 그리기는 lib/og/live-card.
 */
export const alt = "힐리힐리 LIVE 관전"
export const size = LIVE_CARD_SIZE
export const contentType = "image/png"
export const revalidate = 60

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

type Info = {
  title?: string
  status?: string
  starts_at?: string | null
  trail?: { id?: string; name?: string; distance_km?: number | null } | null
}

async function fetchInfo(token: string): Promise<Info | null> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/tracker_event_public_info`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
    },
    body: JSON.stringify({ p_token: token }),
    next: { revalidate: 60 },
  })
  return res.ok ? ((await res.json()) as Info) : null
}

function startLabel(status: string | undefined, startsAt: string | null | undefined): string {
  if (status === "finished") return "종료된 이벤트"
  if (!startsAt) return "실시간 위치"
  const start = new Date(startsAt)
  const fmt = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(start)
  const get = (t: string) => fmt.find((p) => p.type === t)?.value ?? ""
  const when = `${get("month")}/${get("day")}(${get("weekday")}) ${get("hour")}:${get("minute")}`
  return start.getTime() > Date.now() ? `${when} 출발` : `LIVE · ${when} 출발`
}

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token: key } = await params
  const token = await resolveWatchTokenServer(key)
  const info = token ? await fetchInfo(token).catch(() => null) : null
  const thumb = info?.trail?.id ? await fetchTrailThumbUrl(info.trail.id) : null
  return liveCardImage({
    title: info?.title ?? "힐리힐리 LIVE",
    subtitle: [
      info?.trail?.name,
      info?.trail?.distance_km != null ? `${Number(info.trail.distance_km).toFixed(1)}km` : null,
    ],
    when: info ? startLabel(info.status, info.starts_at) : "실시간 관전",
    thumbUrl: thumb,
  })
}
