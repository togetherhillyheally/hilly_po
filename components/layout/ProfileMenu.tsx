"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
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

/** 헤더 우측 프로필 아바타 — 클릭 시 내 정보 + 로그아웃 메뉴 */
export function ProfileMenu() {
  const router = useRouter()
  const { user } = useCurrentUser()
  const [profile, setProfile] = useState<{
    nickname: string | null
    avatar_url: string | null
  } | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    getSupabase()
      .from("profiles")
      .select("nickname, avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) {
          setProfile(data as { nickname: string | null; avatar_url: string | null })
        }
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
          size="icon"
          className="h-9 w-9 rounded-full"
          title={nickname}
        >
          <Avatar className="h-8 w-8">
            {profile?.avatar_url && (
              <AvatarImage src={profile.avatar_url} alt={nickname} />
            )}
            <AvatarFallback className="text-xs font-bold">
              {nickname.slice(0, 1)}
            </AvatarFallback>
          </Avatar>
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
