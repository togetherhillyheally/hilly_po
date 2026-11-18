import type { Metadata } from "next"
import type { ReactNode } from "react"

/**
 * 개인 도전 중계 /live/<slug> 메타데이터 — 공개 RPC 로 방송 제목·소개를 받아 탭 타이틀·카카오톡 미리보기를 채운다.
 * 이미지는 같은 폴더의 opengraph-image.tsx. 짧은 주소라 검색 색인은 제외(noindex).
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string }>
}): Promise<Metadata> {
  const { key } = await params
  const base: Metadata = { robots: { index: false, follow: false } }
  try {
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/public_broadcast_by_key`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anon,
          Authorization: `Bearer ${anon}`,
        },
        body: JSON.stringify({ p_key: decodeURIComponent(key) }),
        next: { revalidate: 60 },
      },
    )
    if (!res.ok) throw new Error("not found")
    const b = (await res.json()) as {
      title?: string
      intro?: string | null
      status?: string
      host?: { nickname?: string | null } | null
    } | null
    if (!b?.title) throw new Error("not found")
    const title = `${b.title} · 힐리힐리 LIVE`
    const who = b.host?.nickname ? `${b.host.nickname}님의 도전` : "도전"
    const description =
      b.intro?.trim() ||
      (b.status === "ended" ? `${who}이 끝났어요. 기록과 응원을 볼 수 있어요.` : `${who}을 실시간으로 응원해요.`)
    return {
      ...base,
      title,
      description,
      openGraph: { title, description, siteName: "힐리힐리 LIVE" },
      twitter: { card: "summary_large_image", title, description },
    }
  } catch {
    return { ...base, title: "힐리힐리 LIVE" }
  }
}

export default function LiveLayout({ children }: { children: ReactNode }) {
  return children
}
