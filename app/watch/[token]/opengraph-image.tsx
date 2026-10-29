import { ImageResponse } from "next/og"

/**
 * 관전 링크 공유 미리보기 이미지 (카카오톡·슬랙 등 og:image).
 * 코스 썸네일을 배경으로, 이벤트 제목 · 코스/거리 · 출발 시각(또는 LIVE/종료)을 얹는다.
 * 한글은 기본 글꼴에 없어서 Noto Sans KR 을 쓰는 글자만 받아 넣는다.
 */
export const alt = "힐리힐리 LIVE 관전"
export const size = { width: 1200, height: 630 }
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

async function fetchThumbUrl(trailId: string): Promise<string | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/trails?id=eq.${trailId}&select=thumbnail_path`,
    { headers: { apikey: ANON }, next: { revalidate: 300 } },
  )
  if (!res.ok) return null
  const rows = (await res.json()) as { thumbnail_path: string | null }[]
  const path = rows[0]?.thumbnail_path
  return path ? `${SUPABASE_URL}/storage/v1/object/public/trail-thumbnails/${path}` : null
}

/** 필요한 글자만 담은 Noto Sans KR (truetype) — 실패하면 null (기본 글꼴로 그림) */
async function loadFont(text: string, weight: 500 | 800): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(
        `https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@${weight}&text=${encodeURIComponent(text)}`,
      )
    ).text()
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1]
    if (!url) return null
    return await (await fetch(url)).arrayBuffer()
  } catch {
    return null
  }
}

function startLabel(info: Info): string {
  if (info.status === "finished") return "종료된 이벤트"
  if (!info.starts_at) return "실시간 위치"
  const start = new Date(info.starts_at)
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

export default async function Image({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const info = await fetchInfo(token).catch(() => null)
  const title = info?.title ?? "힐리힐리 LIVE"
  const course = info?.trail?.name ?? ""
  const km =
    info?.trail?.distance_km != null ? `${Number(info.trail.distance_km).toFixed(1)}km` : ""
  const when = info ? startLabel(info) : "실시간 관전"
  const thumb = info?.trail?.id ? await fetchThumbUrl(info.trail.id).catch(() => null) : null

  const allText = `HILLY HEALLY LIVE ${title} ${course} ${km} ${when} 실시간으로 함께 관전해요`
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
        {thumb && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt=""
            width={1200}
            height={630}
            style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 630, objectFit: "cover" }}
          />
        )}
        {/* 글자 가독성 — 왼쪽은 진하게, 오른쪽은 지도가 보이게 */}
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
              LIVE
            </div>
            <div style={{ display: "flex", fontSize: 26, fontWeight: 800, letterSpacing: 3, opacity: 0.75 }}>
              HILLY HEALLY
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 820 }}>
            <div style={{ display: "flex", fontSize: 84, fontWeight: 800, lineHeight: 1.05 }}>
              {title}
            </div>
            {(course || km) && (
              <div style={{ display: "flex", gap: 20, fontSize: 34, fontWeight: 500, opacity: 0.8 }}>
                {course && <span>{course}</span>}
                {km && <span>{km}</span>}
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
              {when}
            </div>
            <div style={{ display: "flex", fontSize: 28, fontWeight: 500, opacity: 0.7 }}>
              실시간으로 함께 관전해요
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined },
  )
}
