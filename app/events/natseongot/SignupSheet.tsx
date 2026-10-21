"use client"

import { useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useIsMobile } from "@/components/ui/use-mobile"
import { getSupabase } from "@/lib/supabase/client"
import { NATSEONGOT as EV } from "@/lib/events"
import { SignupForm } from "./SignupForm"

/** 신청 폼 패널 — 데스크톱은 오른쪽, 모바일은 아래에서 올라와요.
 *  신청은 힐리힐리 계정 필수 — 비로그인 시 로그인으로 보내고 돌아오게 한다. */
export function SignupSheet({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [authed, setAuthed] = useState<boolean | null>(null)
  const isMobile = useIsMobile()
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    getSupabase()
      .auth.getSession()
      .then(({ data }) => {
        if (!cancelled) setAuthed(!!data.session)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleOpenChange = (next: boolean) => {
    if (next && authed === false) {
      router.push(`/login?next=${encodeURIComponent(EV.path)}`)
      return
    }
    setOpen(next)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={
          isMobile
            ? "flex h-[92dvh] w-full flex-col gap-0 rounded-t-2xl p-0"
            : "flex w-full flex-col gap-0 p-0 sm:max-w-2xl"
        }
      >
        <SheetHeader className="space-y-1 border-b px-6 py-5 text-left">
          <SheetTitle className="text-lg tracking-tight">
            낯선곳으로 참가 신청
          </SheetTitle>
          <SheetDescription className="text-xs">
            {EV.dateLabel} · {EV.placeLabel} · {EV.capacity}명 한정
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <SignupForm />
        </div>
      </SheetContent>
    </Sheet>
  )
}
