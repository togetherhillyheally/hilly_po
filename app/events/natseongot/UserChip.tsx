"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LogOut, Ticket } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getSupabase } from "@/lib/supabase/client"
import { NATSEONGOT as EV } from "@/lib/events"
import { SignupSheet } from "./SignupSheet"

/** auth.users.phone(8210…) → 010-0000-0000 */
function formatPhone(phone: string | undefined | null): string | null {
  if (!phone) return null
  const digits = ("0" + phone.replace(/\D/g, "").replace(/^82/, "")).replace(
    /^00/,
    "0"
  )
  if (digits.length === 11)
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  return digits
}

/** 헤더 로그인 상태 — 앱 프로필(아바타·닉네임) 표시, 메뉴로 내 정보/신청 내역 접근 */
export function UserChip() {
  const router = useRouter()
  // undefined = 확인 중, null = 비로그인
  const [me, setMe] = useState<
    | { nickname: string; avatarUrl: string | null; phone: string | null }
    | null
    | undefined
  >(undefined)
  const sheetTriggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const {
        data: { user },
      } = await getSupabase().auth.getUser()
      if (cancelled) return
      if (!user) {
        setMe(null)
        return
      }
      const { data } = await getSupabase()
        .from("profiles")
        .select("nickname, avatar_url")
        .eq("id", user.id)
        .maybeSingle()
      if (cancelled) return
      const p = data as { nickname?: string; avatar_url?: string } | null
      setMe({
        nickname: p?.nickname ?? "내 계정",
        avatarUrl: p?.avatar_url ?? null,
        phone: formatPhone(user.phone),
      })
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (me === undefined) return null

  if (me === null) {
    return (
      <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
        <Link href={`/login?next=${encodeURIComponent(EV.path)}`}>로그인</Link>
      </Button>
    )
  }

  return (
    <>
      {/* 신청 내역 메뉴에서 여는 숨은 트리거 */}
      <SignupSheet>
        <button ref={sheetTriggerRef} className="hidden" aria-hidden />
      </SignupSheet>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            title={me.nickname}
            className="max-w-[180px] gap-2 pl-1.5 text-foreground/90"
          >
            <Avatar className="h-7 w-7">
              {me.avatarUrl && (
                <AvatarImage src={me.avatarUrl} alt={me.nickname} />
              )}
              <AvatarFallback className="text-xs font-bold">
                {me.nickname.slice(0, 1)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-sm">{me.nickname}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>
            <p className="truncate text-sm font-semibold">{me.nickname}</p>
            {me.phone && (
              <p className="mt-0.5 text-xs font-normal text-muted-foreground">
                {me.phone}
              </p>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer"
            onSelect={() => {
              // 드롭다운이 닫힌 뒤 시트를 열어야 포커스가 꼬이지 않음
              setTimeout(() => sheetTriggerRef.current?.click(), 0)
            }}
          >
            <Ticket className="mr-2 h-4 w-4" />
            신청 내역
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={async () => {
              await getSupabase().auth.signOut()
              router.refresh()
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            로그아웃
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
