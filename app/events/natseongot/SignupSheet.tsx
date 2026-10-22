"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Ticket } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { NATSEONGOT as EV, callEventFn } from "@/lib/events"
import { MySignup, type MySignupData } from "./MySignup"
import { SignupForm } from "./SignupForm"

/** 신청 폼 패널 — 데스크톱은 오른쪽, 모바일은 아래에서 올라와요.
 *  신청은 힐리힐리 계정 필수 — 비로그인 시 로그인으로 보내고 돌아오게 한다.
 *  이미 결제한 계정이면 폼 대신 내 신청(내역·영수증·취소)을 보여준다. */
export function SignupSheet({
  children,
  intent = "signup",
}: {
  children: ReactNode
  /** signup: 신청 버튼(내역 없으면 폼) / history: 신청 내역(없으면 빈 상태 안내) */
  intent?: "signup" | "history"
}) {
  const [open, setOpen] = useState(false)
  const [authed, setAuthed] = useState<boolean | null>(null)
  // undefined = 조회 중, null = 신청 없음
  const [mine, setMine] = useState<MySignupData | null | undefined>(undefined)
  const [forceForm, setForceForm] = useState(false)
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

  const loadMine = useCallback(async () => {
    setMine(undefined)
    try {
      const res = await callEventFn<{ signup: MySignupData | null }>({
        action: "mine",
        eventSlug: EV.slug,
      })
      setMine(res.signup)
    } catch {
      setMine(null) // 조회 실패 시 폼으로 — 신청 자체는 서버가 중복 차단
    }
  }, [])

  const handleOpenChange = (next: boolean) => {
    if (next && authed === false) {
      router.push(`/login?next=${encodeURIComponent(EV.path)}`)
      return
    }
    if (next) {
      setForceForm(false)
      loadMine()
    }
    setOpen(next)
  }

  const showMine = !forceForm && mine != null
  const loading = mine === undefined
  // 신청 내역으로 들어왔는데 내역이 없으면 — 폼 대신 빈 상태를 먼저 보여준다
  const showEmpty = intent === "history" && !forceForm && mine === null

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
            {showMine || showEmpty ? "신청 내역" : "ROUTE @광교 참가 신청"}
          </SheetTitle>
          <SheetDescription className="text-xs">
            {EV.dateLabel} · {EV.placeLabel} · {EV.capacity}명 한정
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {loading ? (
            <p className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              신청 내역을 확인하는 중…
            </p>
          ) : showEmpty ? (
            <div className="py-16 text-center">
              <Ticket
                className="mx-auto h-10 w-10 text-muted-foreground/50"
                strokeWidth={1.5}
              />
              <h3 className="mt-4 text-lg font-semibold tracking-tight">
                아직 신청 내역이 없어요
              </h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                ROUTE @광교에 신청하면 여기서 결제 내역과
                <br />
                영수증, 취소를 관리할 수 있어요.
              </p>
              <Button
                className="mt-6 h-11 bg-[#DC2F55] px-8 text-white hover:bg-[#DC2F55]/90"
                onClick={() => setForceForm(true)}
              >
                참가 신청하러 가기
              </Button>
            </div>
          ) : showMine && mine ? (
            <MySignup
              data={mine}
              onChanged={loadMine}
              onResignup={() => setForceForm(true)}
            />
          ) : (
            <SignupForm />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
