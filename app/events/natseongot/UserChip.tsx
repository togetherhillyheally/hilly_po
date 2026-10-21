"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CircleUserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getSupabase } from "@/lib/supabase/client"
import { NATSEONGOT as EV } from "@/lib/events"
import { SignupSheet } from "./SignupSheet"

/** 헤더 로그인 상태 — 로그인하면 닉네임이 보이고, 누르면 내 신청으로 들어가요. */
export function UserChip() {
  // undefined = 확인 중, null = 비로그인
  const [nickname, setNickname] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const {
        data: { user },
      } = await getSupabase().auth.getUser()
      if (cancelled) return
      if (!user) {
        setNickname(null)
        return
      }
      const { data } = await getSupabase()
        .from("profiles")
        .select("nickname")
        .eq("id", user.id)
        .maybeSingle()
      if (cancelled) return
      setNickname((data as { nickname?: string } | null)?.nickname ?? "내 계정")
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (nickname === undefined) return null

  if (nickname === null) {
    return (
      <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
        <Link href={`/login?next=${encodeURIComponent(EV.path)}`}>로그인</Link>
      </Button>
    )
  }

  return (
    <SignupSheet>
      <Button
        variant="ghost"
        size="sm"
        title="내 신청 보기"
        className="max-w-[160px] text-muted-foreground hover:text-foreground"
      >
        <CircleUserRound className="mr-1.5 h-4 w-4 shrink-0" />
        <span className="truncate">{nickname}</span>
      </Button>
    </SignupSheet>
  )
}
