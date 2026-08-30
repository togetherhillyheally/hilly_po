import type { Metadata } from "next"
import type { ReactNode } from "react"

/**
 * 관전 페이지 메타데이터 — 공개 RPC 로 이벤트 제목을 받아
 * 탭 타이틀·카카오톡/슬랙 공유 미리보기(OG)를 채운다.
 * 토큰 기반 URL 이라 검색 색인은 제외(noindex).
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params
  const base: Metadata = { robots: { index: false, follow: false } }
  try {
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/tracker_event_public_info`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anon,
          Authorization: `Bearer ${anon}`,
        },
        body: JSON.stringify({ p_token: token }),
        next: { revalidate: 60 },
      },
    )
    if (!res.ok) throw new Error("event not found")
    const info = (await res.json()) as {
      title?: string
      event_type?: string
      trail?: { name?: string; distance_km?: number } | null
    }
    const title = `${info.title ?? "이벤트"} · 힐리힐리 LIVE`
    const description = info.trail?.name
      ? `${info.trail.name}${
          info.trail.distance_km ? ` ${Number(info.trail.distance_km).toFixed(1)}km` : ""
        } — 실시간으로 함께 관전해요.`
      : "실시간으로 함께 관전해요."
    return {
      ...base,
      title,
      description,
      openGraph: { title, description, siteName: "힐리힐리 LIVE" },
    }
  } catch {
    return { ...base, title: "힐리힐리 LIVE" }
  }
}

export default function WatchLayout({ children }: { children: ReactNode }) {
  return children
}
