"use client"

import { type ReactNode, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { LayoutGrid, LogOut } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useCurrentUser } from "@/hooks/use-current-user"
import { getSupabase } from "@/lib/supabase/client"

/** auth.users.phone(8210…) → 010-0000-0000 */
function formatPhone(phone: string | undefined | null): string | null {
  if (!phone) return null
  const digits = ("0" + phone.replace(/\D/g, "").replace(/^82/, "")).replace(
    /^00/,
    "0",
  )
  if (digits.length === 11)
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  return digits
}

type Profile = { nickname: string | null; avatar_url: string | null }
// 사용자별 프로필 메모 — 페이지 이동으로 헤더가 다시 마운트돼도 사진·닉네임이 깜빡이지 않게
const profileCache = new Map<string, Profile>()

/** 헤더 우측 프로필 칩(작은 아바타 + 닉네임) — 클릭 시 내 정보 · 내 지도 · {menuItems} · 로그아웃.
 *  SiteHeader 전용 — 모든 화면이 같은 모양·위치 */
export function ProfileMenu({ menuItems }: { menuItems?: ReactNode }) {
  const router = useRouter()
  const { user } = useCurrentUser()
  const [profile, setProfile] = useState<Profile | null>(
    user ? (profileCache.get(user.id) ?? null) : null,
  )

  useEffect(() => {
    if (!user) return
    const cached = profileCache.get(user.id)
    if (cached) setProfile(cached)
    let cancelled = false
    getSupabase()
      .from("profiles")
      .select("nickname, avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) profileCache.set(user.id, data as Profile)
        if (!cancelled && data) setProfile(data as Profile)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  if (!user) return null

  const nickname = profile?.nickname ?? "내 계정"
  const phone = formatPhone(user.phone)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          title={nickname}
          className="max-w-[180px] gap-2 pl-1.5 text-foreground/90"
        >
          {/* 사진은 일반 img — Radix AvatarImage 는 마운트마다 '로딩' 상태로 시작해 글자 대체가 한 번 깜빡인다 */}
          <Avatar className="h-7 w-7">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={nickname}
                className="h-full w-full object-cover"
              />
            ) : (
              <AvatarFallback className="text-xs font-bold">
                {profile ? nickname.slice(0, 1) : ""}
              </AvatarFallback>
            )}
          </Avatar>
          {/* 모바일은 메뉴 자리를 위해 아바타만. 닉네임은 불러온 뒤에만 ("내 계정"→닉네임 폭 변화 방지) */}
          {profile && (
            <span className="hidden truncate text-sm sm:inline">{nickname}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>
          <p className="truncate text-sm font-semibold">{nickname}</p>
          {phone && (
            <p className="mt-0.5 text-xs font-normal text-muted-foreground">
              {phone}
            </p>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/maps">
            <LayoutGrid className="mr-2 h-4 w-4" />
            내 지도
          </Link>
        </DropdownMenuItem>
        {menuItems}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={async () => {
            await getSupabase().auth.signOut()
            router.replace("/")
            router.refresh()
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          로그아웃
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
