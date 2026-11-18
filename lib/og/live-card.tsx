import { ImageResponse } from "next/og"

/**
 * 공유 미리보기 카드(1200×630) — 관전(/watch)과 개인 중계(/live)가 같이 쓴다.
 * 코스 썸네일 배경 + 제목 · 부제(코스/거리) · 상태 칩 · 한 줄 문구. 한글은 Noto Sans KR 글자만 받아 넣는다.
 */
export const LIVE_CARD_SIZE = { width: 1200, height: 630 }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/** 코스 썸네일 공개 URL (없으면 null) */
export async function fetchTrailThumbUrl(trailId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/trails?id=eq.${trailId}&select=thumbnail_path`,
      { headers: { apikey: ANON }, next: { revalidate: 300 } },
    )
    if (!res.ok) return null
    const rows = (await res.json()) as { thumbnail_path: string | null }[]
    const path = rows[0]?.thumbnail_path
    return path ? `${SUPABASE_URL}/storage/v1/object/public/trail-thumbnails/${path}` : null
  } catch {
    return null
  }
}

/** 필요한 글자만 담은 Noto Sans KR — 하루 캐시(카카오톡 스크래퍼는 몇 초만 기다린다). 실패하면 null */
async function loadFont(text: string, weight: 500 | 800): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(
        `https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@${weight}&text=${encodeURIComponent(text)}`,
        { next: { revalidate: 86400 } },
      )
    ).text()
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1]
    if (!url) return null
    return await (await fetch(url, { next: { revalidate: 86400 } })).arrayBuffer()
  } catch {
    return null
  }
}

export async function liveCardImage(opts: {
  title: string
  /** 부제 — 코스 이름·거리 등 (빈 항목은 뺀다) */
  subtitle?: (string | null | undefined)[]
  /** 상태 칩 — "LIVE · 11/16(일) 07:00 출발", "종료된 이벤트" 등 */
  when: string
  tagline?: string
  thumbUrl?: string | null
  /** 왼쪽 위 작은 라벨 (기본 LIVE) */
  badge?: string
}): Promise<ImageResponse> {
  const subtitle = (opts.subtitle ?? []).filter((s): s is string => !!s)
  const tagline = opts.tagline ?? "실시간으로 함께 관전해요"
  const badge = opts.badge ?? "LIVE"
  const allText = `HILLY HEALLY ${badge} ${opts.title} ${subtitle.join(" ")} ${opts.when} ${tagline}`
  const [bold, medium] = await Promise.all([loadFont(allText, 800), loadFont(allText, 500)])
  const fonts = [
    ...(bold ? [{ name: "NotoKR", data: bold, weight: 800 as const, style: "normal" as const }] : []),
    ...(medium ? [{ name: "NotoKR", data: medium, weight: 500 as const, style: "normal" as const }] : []),
  ]

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "#0f1115",
          fontFamily: "NotoKR",
        }}
      >
        {opts.thumbUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={opts.thumbUrl}
            alt=""
            width={1200}
            height={630}
            style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 630, objectFit: "cover" }}
          />
        )}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            display: "flex",
            backgroundImage:
              "linear-gradient(90deg, rgba(15,17,21,0.94) 0%, rgba(15,17,21,0.82) 45%, rgba(15,17,21,0.25) 100%)",
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "64px 72px",
            width: "100%",
            height: "100%",
            color: "white",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                display: "flex",
                padding: "8px 18px",
                borderRadius: 999,
                background: "#DC2F55",
                fontSize: 26,
                fontWeight: 800,
                letterSpacing: 2,
              }}
            >
              {badge}
            </div>
            <div style={{ display: "flex", fontSize: 26, fontWeight: 800, letterSpacing: 3, opacity: 0.75 }}>
              HILLY HEALLY
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 820 }}>
            <div style={{ display: "flex", fontSize: opts.title.length > 14 ? 64 : 84, fontWeight: 800, lineHeight: 1.05 }}>
              {opts.title}
            </div>
            {subtitle.length > 0 && (
              <div style={{ display: "flex", gap: 20, fontSize: 34, fontWeight: 500, opacity: 0.8 }}>
                {subtitle.map((s, i) => (
                  <span key={i}>{s}</span>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                display: "flex",
                padding: "12px 24px",
                borderRadius: 16,
                background: "rgba(255,255,255,0.16)",
                border: "2px solid rgba(255,255,255,0.25)",
                fontSize: 36,
                fontWeight: 800,
              }}
            >
              {opts.when}
            </div>
            <div style={{ display: "flex", fontSize: 28, fontWeight: 500, opacity: 0.7 }}>{tagline}</div>
          </div>
        </div>
      </div>
    ),
    { ...LIVE_CARD_SIZE, fonts: fonts.length ? fonts : undefined },
  )
}
