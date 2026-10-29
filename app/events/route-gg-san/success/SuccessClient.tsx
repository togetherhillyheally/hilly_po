"use client"

import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Loader2,
  MapPin,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { NATSEONGOT as EV, callEventFn } from "@/lib/events"
import { SiteHeader } from "@/components/layout/SiteHeader"
import { clearDraft } from "../draft"

export function SuccessClient() {
  const sp = useSearchParams()
  const ran = useRef(false)
  const [state, setState] = useState<"loading" | "done" | "error">("loading")
  const [name, setName] = useState("")
  // 보여주는 신청번호 (ROUTE-GG-001) — 결제 확정 응답에서 받음
  const [signupNo, setSignupNo] = useState("")
  const [message, setMessage] = useState("")

  const orderId = sp.get("orderId") ?? ""
  const paymentKey = sp.get("paymentKey") ?? ""
  const amount = sp.get("amount") ?? ""

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    if (!orderId || !paymentKey || !amount) {
      setMessage("결제 정보가 없어요. 신청 내역을 다시 확인해주세요.")
      setState("error")
      return
    }

    callEventFn<{ success: boolean; name?: string; signupNo?: string | null }>({
      action: "confirm",
      orderId,
      paymentKey,
      amount: Number(amount),
    })
      .then((d) => {
        clearDraft() // 결제 완료 — 임시저장한 신청서는 더 필요 없음
        setName(d.name ?? "")
        setSignupNo(d.signupNo ?? "")
        setState("done")
      })
      .catch((err: unknown) => {
        setMessage(
          err instanceof Error
            ? err.message
            : "결제 승인 중 문제가 생겼어요. 인스타그램 DM으로 문의해주세요."
        )
        setState("error")
      })
  }, [orderId, paymentKey, amount])

  return (
    <>
      {/* 사이트 공통 헤더 — 본문 컨테이너 밖 */}
      <SiteHeader />
    <main className="event-readable mx-auto max-w-6xl break-keep px-6">

      <div className="flex min-h-[70dvh] items-center justify-center py-12">
        <div className="w-full max-w-lg">
          {state === "loading" && (
            <div className="rounded-2xl border bg-card p-10 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#DC2F55]" />
              <p className="mt-4 text-sm text-muted-foreground">
                결제를 확인하고 있어요…
              </p>
            </div>
          )}

          {state === "done" && (
            <div className="rounded-2xl border bg-card p-10 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#DC2F55]/10">
                <CheckCircle2
                  className="h-7 w-7 text-[#DC2F55]"
                  strokeWidth={1.5}
                />
              </span>
              <h1 className="mt-5 text-2xl font-bold tracking-tighter">
                신청이 확정됐어요
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {name ? `${name}님, ` : ""}ROUTE @광교산에서 만나요.
                <br />
                팀 배정과 집결 안내는 행사 일주일 전에 문자로 보내드릴게요.
              </p>

              <dl className="mt-7 space-y-3 rounded-xl border bg-background p-5 text-left">
                <div className="flex items-center gap-3">
                  <CalendarDays
                    className="h-4 w-4 shrink-0 text-[#DC2F55]"
                    strokeWidth={1.5}
                  />
                  <div>
                    <dt className="text-sm font-semibold">{EV.dateLabel}</dt>
                    <dd className="text-xs text-muted-foreground">
                      {EV.timeLabel}
                    </dd>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin
                    className="h-4 w-4 shrink-0 text-[#DC2F55]"
                    strokeWidth={1.5}
                  />
                  <div>
                    <dt className="text-sm font-semibold">{EV.placeLabel}</dt>
                    <dd className="text-xs text-muted-foreground">
                      12:00까지 광교산 산림욕장 집결
                    </dd>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t pt-3">
                  <dt className="text-xs text-muted-foreground">신청번호</dt>
                  <dd
                    className={
                      signupNo
                        ? "font-mono text-sm font-semibold"
                        : "font-mono text-xs text-muted-foreground"
                    }
                  >
                    {signupNo || orderId}
                  </dd>
                </div>
              </dl>

              <Button asChild variant="outline" className="mt-7 w-full">
                <Link href={EV.path}>행사 안내 다시 보기</Link>
              </Button>
            </div>
          )}

          {state === "error" && (
            <div className="rounded-2xl border border-destructive/30 bg-card p-10 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle
                  className="h-7 w-7 text-destructive"
                  strokeWidth={1.5}
                />
              </span>
              <h1 className="mt-5 text-xl font-bold tracking-tighter">
                결제를 확인하지 못했어요
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {message}
              </p>
              {orderId && (
                <p className="mt-2 font-mono text-xs text-muted-foreground">
                  문의할 때 알려주세요 · {orderId}
                </p>
              )}
              <Button asChild variant="outline" className="mt-7 w-full">
                <Link href={`${EV.path}#signup`}>신청 페이지로 돌아가기</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </main>
    </>
  )
}
