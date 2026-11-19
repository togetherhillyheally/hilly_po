"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { loadTossPayments, type TossWidgets } from "@/app/events/route-gg-san/toss"
import { TOSS_CLIENT_KEY } from "@/lib/events"
import { callBroadcastFn } from "@/lib/broadcast-fn"
import {
  type PublicBroadcast,
  SPONSOR_MAX,
  SPONSOR_MIN,
  SPONSOR_PRESETS,
} from "@/lib/repos/broadcastTypes"

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`

/**
 * 후원 다이얼로그 — 1단계 금액·메시지·표시 이름·익명 → 주문 생성 → 2단계 토스 결제위젯 → requestPayment.
 * 성공 주소는 /sponsor/success?return=<지금 페이지> (토스가 paymentKey·orderId·amount 를 붙여 돌려보낸다).
 */
export default function SponsorDialog({
  broadcast,
  open,
  onOpenChange,
}: {
  broadcast: PublicBroadcast
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const pathname = usePathname()
  const [amount, setAmount] = useState<number>(5000)
  const [custom, setCustom] = useState("")
  const [message, setMessage] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [anonymous, setAnonymous] = useState(false)
  const [step, setStep] = useState<"form" | "widget">("form")
  const [busy, setBusy] = useState(false)
  const [order, setOrder] = useState<{ orderId: string; amount: number; orderName: string } | null>(null)
  const [widgetReady, setWidgetReady] = useState(false)
  const widgetsRef = useRef<TossWidgets | null>(null)

  const finalAmount = custom ? Number(custom.replace(/\D/g, "")) : amount
  const amountOk = Number.isInteger(finalAmount) && finalAmount >= SPONSOR_MIN && finalAmount <= SPONSOR_MAX

  // 닫으면 처음부터
  useEffect(() => {
    if (!open) {
      setStep("form")
      setOrder(null)
      setWidgetReady(false)
      widgetsRef.current = null
    }
  }, [open])

  // 2단계 — 결제위젯 렌더
  useEffect(() => {
    if (step !== "widget" || !order) return
    let cancelled = false
    setWidgetReady(false)
    ;(async () => {
      try {
        const TossPayments = await loadTossPayments()
        const widgets = TossPayments(TOSS_CLIENT_KEY).widgets({ customerKey: order.orderId })
        await widgets.setAmount({ currency: "KRW", value: order.amount })
        if (cancelled) return
        await Promise.all([
          widgets.renderPaymentMethods({ selector: "#sponsor-toss-pm", variantKey: "DEFAULT" }),
          widgets.renderAgreement({ selector: "#sponsor-toss-agree" }),
        ])
        if (cancelled) return
        widgetsRef.current = widgets
        setWidgetReady(true)
      } catch (e) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "결제 모듈을 불러오지 못했어요.")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [step, order])

  async function createOrder() {
    if (!amountOk) {
      toast.error(`후원 금액은 ${won(SPONSOR_MIN)}부터 ${won(SPONSOR_MAX)}까지예요.`)
      return
    }
    setBusy(true)
    try {
      const r = await callBroadcastFn<{ orderId: string; amount: number; orderName: string }>("broadcast-sponsor", {
        action: "create",
        broadcastId: broadcast.id,
        amount: finalAmount,
        message: message.trim() || null,
        displayName: displayName.trim() || null,
        isAnonymous: anonymous,
      })
      setOrder({ orderId: r.orderId, amount: r.amount, orderName: r.orderName })
      setStep("widget")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "주문을 만들지 못했어요.")
    } finally {
      setBusy(false)
    }
  }

  async function pay() {
    const widgets = widgetsRef.current
    if (!widgets || !order) return
    try {
      const origin = window.location.origin
      const ret = encodeURIComponent(pathname ?? "/")
      await widgets.requestPayment({
        orderId: order.orderId,
        orderName: order.orderName,
        successUrl: `${origin}/sponsor/success?return=${ret}`,
        failUrl: `${origin}/sponsor/fail?return=${ret}`,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : "결제를 완료하지 못했어요."
      if (msg.includes("USER_CANCEL") || msg.includes("취소")) return
      toast.error(msg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="theme-light max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{broadcast.host?.nickname ?? "도전자"}님 후원하기</DialogTitle>
          <DialogDescription>
            {step === "form" ? "금액과 응원 메시지를 정해 주세요." : `${won(order?.amount ?? 0)} 결제`}
          </DialogDescription>
        </DialogHeader>

        {step === "form" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {SPONSOR_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setAmount(p)
                    setCustom("")
                  }}
                  className={
                    "rounded-xl border py-2.5 text-sm font-bold tabular-nums transition-colors " +
                    (!custom && amount === p
                      ? "border-amber-500 bg-amber-500 text-white"
                      : "hover:bg-muted")
                  }
                >
                  {won(p)}
                </button>
              ))}
            </div>
            <input
              inputMode="numeric"
              value={custom}
              onChange={(e) => setCustom(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="직접 입력 (1,000 ~ 500,000원)"
              className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-amber-500/40"
            />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 100))}
              rows={2}
              placeholder="응원 메시지 (100자, 채팅에 공개돼요)"
              className="w-full resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500/40"
            />
            <div className="flex items-center gap-2">
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value.slice(0, 20))}
                disabled={anonymous}
                placeholder="표시 이름 (비우면 닉네임)"
                className="h-10 min-w-0 flex-1 rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-amber-500/40 disabled:opacity-50"
              />
              <label className="flex shrink-0 items-center gap-1.5 text-sm">
                <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
                익명
              </label>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              플랫폼 수수료 {Math.round(broadcast.sponsor_fee_rate * 100)}%를 제한 금액이 도전자에게 정산돼요.
              후원은 결제 후 환불되지 않아요.
            </p>
            <Button
              className="w-full bg-amber-500 text-white hover:bg-amber-500/90"
              disabled={busy || !amountOk}
              onClick={() => void createOrder()}
            >
              {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              {amountOk ? `${won(finalAmount)} 후원하기` : "금액을 정해 주세요"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div id="sponsor-toss-pm" className="min-h-[120px]" />
            <div id="sponsor-toss-agree" />
            {!widgetReady && (
              <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> 결제창을 불러오는 중…
              </p>
            )}
            <Button
              className="w-full bg-amber-500 text-white hover:bg-amber-500/90"
              disabled={!widgetReady}
              onClick={() => void pay()}
            >
              {won(order?.amount ?? 0)} 결제하기
            </Button>
            <button
              type="button"
              className="w-full text-center text-xs text-muted-foreground hover:underline"
              onClick={() => setStep("form")}
            >
              금액 다시 고르기
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
