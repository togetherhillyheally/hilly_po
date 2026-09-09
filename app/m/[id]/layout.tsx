import type { Metadata } from "next"
import type { ReactNode } from "react"

/**
 * 공개 지도 페이지 메타데이터 — public_map_by_id RPC 로 조회.
 * 완료(published) 지도만 응답. 앱 공개(public) 지도는 검색 색인 허용,
 * 앱 비공개(private) 지도는 링크로만 보는 unlisted 성격이라 noindex.
 * OG 이미지는 지도 썸네일.
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
    const res = await fetch(`${base}/rest/v1/rpc/public_map_by_id`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anon,
        Authorization: `Bearer ${anon}`,
      },
      body: JSON.stringify({ p_id: id }),
      next: { revalidate: 300 },
    })
    if (!res.ok) throw new Error("not found")
    const t = (await res.json()) as {
      name?: string
      map_type?: string
      visibility?: string
      distance_km?: number | string | null
      total_ascent_m?: number | string | null
      thumbnail_path?: string | null
    }
    if (!t?.name) throw new Error("not found")

    const title = `${t.name} · 힐리힐리 MAP`
    const kind = t.map_type === "stamp" ? "스탬프지도" : "코스지도"
    const stats = [
      t.distance_km != null ? `${Number(t.distance_km).toFixed(1)}km` : null,
      t.total_ascent_m != null
        ? `D+${Math.round(Number(t.total_ascent_m))}m`
        : null,
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
      // 앱 비공개 지도는 링크 전용(unlisted) — 검색 색인 제외
      robots:
        t.visibility === "public"
          ? undefined
          : { index: false, follow: false },
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
