"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Check, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { trackerControlRepo } from "@/lib/repos/trackerControlRepo"
import type { AthleteRecord } from "@/lib/repos/trackerControlTypes"

function formatElapsed(sec: number | null): string {
  if (sec == null) return "—"
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const pad = (n: number) => String(n).padStart(2, "0")
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

function formatDate(iso: string | null): string {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

/** 개인 업적 페이지 (공개) — 계정이 연결된 레이스 확정 결과 모음 */
export default function AthletePage() {
  const params = useParams<{ id: string }>()
  const [records, setRecords] = useState<AthleteRecord[] | null>(null)

  useEffect(() => {
    let cancelled = false
    trackerControlRepo
      .athleteRecords(params.id)
      .then((r) => {
        if (!cancelled) setRecords(r)
      })
      .catch(() => {
        if (!cancelled) setRecords([])
      })
    return () => {
      cancelled = true
    }
  }, [params.id])

  const profile = records?.[0] ?? null

  useEffect(() => {
    if (profile?.nickname) {
      document.title = `${profile.nickname}의 업적 · 힐리힐리 LIVE`
    }
  }, [profile?.nickname])

  if (records === null) {
    return (
      <main className="theme-light flex min-h-[100dvh] items-center justify-center bg-background text-sm text-muted-foreground">
        불러오는 중…
      </main>
    )
  }

  if (records.length === 0) {
    return (
      <main className="theme-light flex min-h-[100dvh] flex-col items-center justify-center bg-background px-6 text-center text-foreground">
        <h1 className="text-lg font-bold">아직 기록이 없어요</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          이벤트에 참가하고 계정을 연결하면 업적이 쌓여요.
        </p>
      </main>
    )
  }

  const finished = records.filter((r) => r.status === "finished")
  const totalKm = records.reduce((a, r) => a + (Number(r.distance_km) || 0), 0)
  const totalAscent = records.reduce((a, r) => a + (r.ascent_m ?? 0), 0)
  const bestRank = finished.reduce<number | null>(
    (best, r) =>
      r.rank != null && (best == null || r.rank < best) ? r.rank : best,
    null,
  )

  const stats: { label: string; value: string }[] = [
    { label: "참가", value: `${records.length}회` },
    { label: "완주", value: `${finished.length}회` },
    { label: "누적 거리", value: `${totalKm.toFixed(1)}km` },
    { label: "누적 상승", value: `${totalAscent.toLocaleString()}m` },
    { label: "최고 순위", value: bestRank != null ? `${bestRank}위` : "—" },
  ]

  return (
    <main className="theme-light min-h-[100dvh] bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-10">
        {/* 프로필 */}
        <header className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#DC2F55] bg-[#DC2F55] text-xl font-bold text-white">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={profile.nickname ?? ""}
                className="h-full w-full object-cover"
              />
            ) : (
              (profile?.nickname ?? "?").slice(0, 1)
            )}
          </span>
          <div>
            <p className="text-[10px] font-bold tracking-widest text-muted-foreground">
              HILLY HEALLY LIVE · 업적
            </p>
            <h1 className="text-2xl font-extrabold leading-tight">
              {profile?.nickname ?? "러너"}
            </h1>
          </div>
        </header>

        {/* 요약 */}
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-xl border bg-card px-3 py-3 text-center"
            >
              <p className="text-lg font-extrabold tabular-nums">{s.value}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* 이벤트별 기록 */}
        <h2 className="mb-2 mt-8 text-sm font-semibold text-muted-foreground">
          레이스 기록
        </h2>
        <div className="space-y-2">
          {records.map((r) => (
            <div
              key={`${r.event_id}`}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border bg-card px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{r.event_title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(r.event_starts_at)}
                  {r.category && ` · ${r.category}`}
                </p>
              </div>
              {r.status === "finished" ? (
                <>
                  <div className="text-right">
                    <p className="text-sm font-bold tabular-nums">
                      {r.rank != null ? `전체 ${r.rank}위` : ""}
                      {r.category && r.category_rank != null && (
                        <span className="ml-1.5 font-medium text-muted-foreground">
                          {r.category} {r.category_rank}위
                        </span>
                      )}
                    </p>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {formatElapsed(r.elapsed_sec)}
                      {r.distance_km != null &&
                        ` · ${Number(r.distance_km).toFixed(1)}km`}
                      {r.ascent_m != null && ` · ↑${r.ascent_m}m`}
                    </p>
                  </div>
                  <span
                    title="완주"
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600"
                  >
                    <Check className="h-4 w-4 text-white" strokeWidth={3} />
                  </span>
                </>
              ) : (
                <Badge
                  variant="outline"
                  className="border-red-500/50 text-red-500"
                >
                  DNF
                </Badge>
              )}
              <Link
                href={`/watch/${r.public_token}`}
                title="이벤트 결과 보기"
                className="text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
