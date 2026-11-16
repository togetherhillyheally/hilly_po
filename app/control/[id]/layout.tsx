import type { Metadata } from "next"
import type { ReactNode } from "react"

/**
 * 관제 화면 주소(/control/<id>)를 그대로 카카오톡 등에 붙였을 때의 미리보기.
 * 관리자 주소라 공개 정보가 없어 "관제 · 힐리힐리 LIVE" + 로고만 나오던 것을,
 * 공개 이벤트면 관전 페이지와 같은 제목·설명·이미지(/watch/<token>/opengraph-image)로 맞춘다 (2026-11-16).
 * 준비중·보관 이벤트는 공개 RPC 에 없으므로 기존 일반 메타데이터 그대로.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const base: Metadata = { robots: { index: false, follow: false } }
  try {
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/public_control_events`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anon,
          Authorization: `Bearer ${anon}`,
        },
        body: "{}",
        next: { revalidate: 60 },
      },
    )
    if (!res.ok) throw new Error("rpc failed")
    const list = (await res.json()) as {
      id: string
      title: string
      trail_name: string | null
      public_token: string
    }[]
    const ev = list.find((e) => e.id === id)
    if (!ev) return base
    const title = `${ev.title} · 힐리힐리 LIVE`
    const description = ev.trail_name
      ? `${ev.trail_name} — 실시간으로 함께 관전해요.`
      : "실시간으로 함께 관전해요."
    const watchUrl = `/watch/${ev.public_token}`
    return {
      ...base,
      title,
      description,
      openGraph: {
        title,
        description,
        siteName: "힐리힐리 LIVE",
        url: watchUrl,
        images: [{ url: `${watchUrl}/opengraph-image`, width: 1200, height: 630 }],
      },
      twitter: { card: "summary_large_image", title, description },
    }
  } catch {
    return base
  }
}

export default function ControlRoomLayout({ children }: { children: ReactNode }) {
  return children
}
