"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, Loader2, Ticket } from "lucide-react"
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
function formatOrderDate(x: MySignupData): string {
  const iso =
    x.status === "canceled" ? x.canceledAt : (x.paidAt ?? x.createdAt ?? null)
  if (!iso) return ""
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  const when = `${d.getFullYear()}. ${pad(d.getMonth() + 1)}. ${pad(d.getDate())}.`
  return x.status === "canceled" ? `${when} 취소` : `${when} 결제`
}

export function SignupSheet({
  children,
  intent = "signup",
  autoOpen = false,
}: {
  children: ReactNode
  /** signup: 신청 버튼(내역 없으면 폼) / history: 신청 내역(없으면 빈 상태 안내) */
  intent?: "signup" | "history"
  /** 페이지 들어오자마자 열기 — 문자·디스코드의 신청 내역 바로가기(?mine=1) */
  autoOpen?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [authed, setAuthed] = useState<boolean | null>(null)
  // undefined = 조회 중, [] = 신청 없음 — 결제 완료·취소된 주문 전체(최근 순)
  const [list, setList] = useState<MySignupData[] | undefined>(undefined)
  const [selectedId, setSelectedId] = useState<string | null>(null)
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
    setList(undefined)
    try {
      const res = await callEventFn<{
        signup: MySignupData | null
        signups?: MySignupData[]
      }>({
        action: "mine",
        eventSlug: EV.slug,
      })
      setList(res.signups ?? (res.signup ? [res.signup] : []))
    } catch {
      setList([]) // 조회 실패 시 폼으로 — 신청 자체는 서버가 중복 차단
    }
  }, [])

  const handleOpenChange = (next: boolean) => {
    if (next && authed === false) {
      // 신청 내역은 로그인 뒤 내역 창이 바로 열리도록 돌아온다
      const back = intent === "history" ? `${EV.path}?mine=1` : EV.path
      router.push(`/login?next=${encodeURIComponent(back)}`)
      return
    }
    if (next) {
      setForceForm(false)
      setSelectedId(null)
      // 신청하기는 바로 신청서 — 내역 조회는 '신청 내역'으로 열 때만 (중복 결제는 서버가 막음)
      if (intent === "history") loadMine()
    }
    setOpen(next)
  }

  // 바로가기로 들어오면 로그인 확인이 끝난 뒤 한 번만 연다
  const autoOpenedRef = useRef(false)
  useEffect(() => {
    if (!autoOpen || authed === null || autoOpenedRef.current) return
    autoOpenedRef.current = true
    handleOpenChange(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen, authed])

  const loading = intent === "history" && list === undefined
  const selected = list?.find((x) => x.orderId === selectedId) ?? null
  // 신청하기: 항상 신청서 / 신청 내역: 목록 → 눌러서 상세
  const view: "form" | "detail" | "list" | "empty" =
    forceForm || intent === "signup"
      ? "form"
      : selected
        ? "detail"
        : list && list.length > 0
          ? "list"
          : "empty"
  const detail = selected

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={
          isMobile
            ? "event-readable flex h-[92dvh] w-full flex-col gap-0 break-keep rounded-t-2xl p-0"
            : "event-readable flex w-full flex-col gap-0 break-keep p-0 sm:max-w-2xl"
        }
      >
        <SheetHeader className="space-y-1 border-b px-6 py-5 text-left">
          <SheetTitle className="text-lg tracking-tight">
            {view === "form" ? "ROUTE @광교산 참가 신청" : "신청 내역"}
          </SheetTitle>
          <SheetDescription className="text-xs">
            {EV.dateLabel}, {EV.placeLabel}에서 {EV.capacity}명 한정
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {loading ? (
            <p className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              신청 내역을 확인하는 중…
            </p>
          ) : view === "empty" ? (
            <div className="py-16 text-center">
              <Ticket
                className="mx-auto h-10 w-10 text-muted-foreground/50"
                strokeWidth={1.5}
              />
              <h3 className="mt-4 text-lg font-semibold tracking-tight">
                아직 신청 내역이 없어요
              </h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                ROUTE @광교산에 신청하면
                <br />
                여기서 결제 내역과 영수증을 보고, 취소도 할 수 있어요.
              </p>
              <Button
                className="mt-6 h-11 bg-[#DC2F55] px-8 text-white hover:bg-[#DC2F55]/90"
                onClick={() => setForceForm(true)}
              >
                참가 신청하러 가기
              </Button>
            </div>
          ) : view === "list" && list ? (
            <ul className="space-y-3">
              {list.map((x) => (
                <li key={x.orderId}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(x.orderId)}
                    className="flex w-full items-center gap-4 rounded-xl border bg-card px-5 py-4 text-left transition-colors hover:border-foreground/30"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="font-semibold">{EV.title}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            x.status === "paid"
                              ? "bg-emerald-500/15 text-emerald-400"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {x.status === "paid" ? "결제 완료" : "취소됨"}
                        </span>
                      </span>
                      <span className="mt-1 block truncate text-sm text-muted-foreground">
                        참가자 {x.partySize ?? 1}명, {x.amount.toLocaleString()}원
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {x.signupNo ? `${x.signupNo} · ` : ""}
                        {formatOrderDate(x)}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          ) : view === "detail" && detail ? (
            <>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
                신청 내역
              </button>
              <MySignup
                data={detail}
                onChanged={loadMine}
                onResignup={() => setForceForm(true)}
              />
            </>
          ) : (
            <SignupForm />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
