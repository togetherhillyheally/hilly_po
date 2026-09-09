import type { Metadata } from "next"
import type { ReactNode } from "react"

/**
 * 공개 지도 페이지 메타데이터 — 공개(published+public) 지도는 검색 색인 허용,
 * 카카오톡/슬랙 공유 미리보기(OG)에 지도 썸네일을 사용한다.
 * RLS 덕분에 anon 조회로는 공개 지도만 내려온다 (비공개면 404 성격의 기본 메타).
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  try {
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const res = await fetch(
      `${base}/rest/v1/trails?id=eq.${encodeURIComponent(id)}&select=name,distance_km,total_ascent_m,map_type,thumbnail_path`,
      {
        headers: { apikey: anon, Authorization: `Bearer ${anon}` },
        next: { revalidate: 300 },
      },
    )
    if (!res.ok) throw new Error("fetch failed")
    const rows = (await res.json()) as {
      name: string
      distance_km: number | null
      total_ascent_m: number | null
      map_type: string
      thumbnail_path: string | null
    }[]
    const t = rows[0]
    if (!t) throw new Error("not found")

    const title = `${t.name} · 힐리힐리 MAP`
    const kind = t.map_type === "stamp" ? "스탬프지도" : "코스지도"
    const stats = [
      t.distance_km != null ? `${Number(t.distance_km).toFixed(1)}km` : null,
      t.total_ascent_m != null ? `D+${Math.round(Number(t.total_ascent_m))}m` : null,
    ]
      .filter(Boolean)
      .join(" · ")
    const description = `${kind}${stats ? ` · ${stats}` : ""} — 힐리힐리에서 함께 걸어요.`
    const image = t.thumbnail_path
      ? `${base}/storage/v1/object/public/trail-thumbnails/${t.thumbnail_path}`
      : undefined
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        siteName: "힐리힐리 MAP",
        images: image ? [{ url: image }] : undefined,
      },
    }
  } catch {
    return {
      title: "힐리힐리 MAP",
      robots: { index: false, follow: false },
    }
  }
}

export default function PublicMapLayout({ children }: { children: ReactNode }) {
  return children
}
