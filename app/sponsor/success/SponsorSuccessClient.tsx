"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { callBroadcastFn } from "@/lib/broadcast-fn"

/** 돌아갈 주소는 같은 사이트 안 경로만 (오픈 리다이렉트 방지) */
function safeReturn(v: string | null): string {
  if (!v || !v.startsWith("/") || v.startsWith("//")) return "/control"
  return v
}

export function SponsorSuccessClient() {
  const sp = useSearchParams()
  const router = useRouter()
  const ran = useRef(false)
  const [state, setState] = useState<"loading" | "done" | "error">("loading")
  const [message, setMessage] = useState("")
  const orderId = sp.get("orderId") ?? ""
  const paymentKey = sp.get("paymentKey") ?? ""
  const amount = sp.get("amount") ?? ""
  const back = safeReturn(sp.get("return"))

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    if (!orderId || !paymentKey || !amount) {
      setMessage("결제 정보가 없어요.")
      setState("error")
      return
    }
    callBroadcastFn<{ success: boolean }>("broadcast-sponsor", {
      action: "confirm",
      orderId,
      paymentKey,
      amount: Number(amount),
    })
      .then(() => {
        setState("done")
        // 채팅에 후원 메시지가 이미 올라가 있다 — 바로 돌아간다
        setTimeout(() => router.replace(back), 1500)
      })
      .catch((e: unknown) => {
        setMessage(e instanceof Error ? e.message : "결제 승인 중 문제가 생겼어요.")
        setState("error")
      })
  }, [orderId, paymentKey, amount, back, router])

  return (
    <main className="theme-light flex min-h-[100dvh] items-center justify-center bg-background px-6 text-foreground">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-8 text-center">
        {state === "loading" && (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-amber-500" />
            <p className="mt-4 text-sm text-muted-foreground">결제를 확인하고 있어요…</p>
          </>
        )}
        {state === "done" && (
          <>
            <CheckCircle2 className="mx-auto h-10 w-10 text-amber-500" strokeWidth={1.5} />
            <h1 className="mt-4 text-xl font-bold">후원 고마워요!</h1>
            <p className="mt-1 text-sm text-muted-foreground">응원 메시지가 중계 채팅에 올라갔어요.</p>
            <Button asChild className="mt-5 w-full bg-amber-500 text-white hover:bg-amber-500/90">
              <Link href={back}>중계로 돌아가기</Link>
            </Button>
          </>
        )}
        {state === "error" && (
          <>
            <AlertCircle className="mx-auto h-10 w-10 text-red-500" strokeWidth={1.5} />
            <h1 className="mt-4 text-xl font-bold">결제를 확인하지 못했어요</h1>
            <p className="mt-1 text-sm text-muted-foreground">{message}</p>
            <Button asChild variant="outline" className="mt-5 w-full">
              <Link href={back}>중계로 돌아가기</Link>
            </Button>
          </>
        )}
      </div>
    </main>
  )
}
