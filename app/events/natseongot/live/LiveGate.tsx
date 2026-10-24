"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, Radio } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NATSEONGOT as EV } from "@/lib/events"

type LinkState = { status: "none" | "draft" | "live" | "finished"; token?: string | null }

/** 고정 응원 링크 — 모험이 시작되면 관전 화면으로 보내고, 그 전엔 대기 안내 */
export function LiveGate() {
  const router = useRouter()
  const [state, setState] = useState<LinkState | null>(null)

  useEffect(() => {
    let alive = true
    const check = async () => {
      try {
        const { getSupabase } = await import("@/lib/supabase/client")
        const { data, error } = await getSupabase().rpc("event_watch_link", {
          p_trail_id: EV.courseTrailId,
        })
        if (!alive || error) return
        const next = (data ?? { status: "none" }) as LinkState
        if (next.token) {
          router.replace(`/watch/${next.token}`)
          return
        }
        setState(next)
      } catch {
        // 네트워크 오류 — 다음 주기에 다시 시도
      }
    }
    check()
    const poll = setInterval(check, 30_000)
    return () => {
      alive = false
      clearInterval(poll)
    }
  }, [router])

  if (!state) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md break-keep flex-col items-center justify-center px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#DC2F55]/10">
        <Radio className="h-7 w-7 text-[#DC2F55]" strokeWidth={1.5} />
      </span>
      <h1 className="mt-6 text-2xl font-bold tracking-tight">
        {EV.title} 실시간 응원
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        모험이 시작되면 이 화면에서 팀들의 위치를 실시간으로 볼 수 있어요.
        <br />
        {EV.dateLabel} · 시작되면 자동으로 열려요.
      </p>
      <p className="mt-6 text-xs text-muted-foreground">
        이 링크를 가족·지인에게 미리 공유해두세요.
      </p>
      <Button asChild variant="outline" className="mt-8">
        <Link href={EV.path}>이벤트 안내 보기</Link>
      </Button>
    </main>
  )
}
