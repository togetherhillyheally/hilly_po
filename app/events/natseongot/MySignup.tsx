"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  RotateCcw,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { NATSEONGOT as EV, callEventFn } from "@/lib/events"

export type MySignupData = {
  orderId: string
  name: string
  names?: string[]
  partySize?: number
  amount: number
  status: "paid" | "canceled"
  paidAt: string | null
  canceledAt: string | null
  receipt: string | null
  cancelableUntil: string
  cancelable: boolean
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}. ${pad(d.getMonth() + 1)}. ${pad(d.getDate())}. ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 결제 완료/취소된 내 신청 — 내역·영수증·결제 취소 */
export function MySignup({
  data,
  onChanged,
  onResignup,
}: {
  data: MySignupData
  onChanged: () => void
  onResignup: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const paid = data.status === "paid"

  async function handleCancel() {
    setCanceling(true)
    try {
      await callEventFn<{ success: boolean }>({
        action: "cancel",
        eventSlug: EV.slug,
      })
      toast.success("결제가 취소됐어요. 환불은 영업일 기준 3~5일 걸려요.")
      onChanged()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "결제 취소에 실패했어요."
      )
    } finally {
      setCanceling(false)
      setConfirming(false)
    }
  }

  return (
    <div className="py-4">
      <div className="text-center">
        {paid ? (
          <CheckCircle2
            className="mx-auto h-10 w-10 text-emerald-500"
            strokeWidth={1.5}
          />
        ) : (
          <XCircle
            className="mx-auto h-10 w-10 text-muted-foreground"
            strokeWidth={1.5}
          />
        )}
        <h3 className="mt-4 text-xl font-semibold tracking-tight">
          {paid ? "신청이 완료된 상태예요" : "신청이 취소됐어요"}
        </h3>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {paid
            ? "행사 안내는 문자로 보내드려요."
            : "환불은 영업일 기준 3~5일 안에 결제 수단으로 돌아가요."}
        </p>
      </div>

      <dl className="mt-6 space-y-3 rounded-xl border bg-card p-5 text-sm">
        <div className="flex justify-between gap-6">
          <dt className="shrink-0 text-muted-foreground">
            참가자{(data.partySize ?? 1) > 1 && ` ${data.partySize}명`}
          </dt>
          <dd className="text-right font-semibold">
            {(data.names ?? [data.name]).join(", ")}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">결제 금액</dt>
          <dd className="font-semibold tabular-nums">
            {data.amount.toLocaleString()}원
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">
            {paid ? "결제 일시" : "취소 일시"}
          </dt>
          <dd className="tabular-nums">
            {formatDate(paid ? data.paidAt : data.canceledAt)}
          </dd>
        </div>
        <div className="flex justify-between border-t pt-3">
          <dt className="text-muted-foreground">주문번호</dt>
          <dd className="font-mono text-xs text-muted-foreground">
            {data.orderId}
          </dd>
        </div>
      </dl>

      <div className="mt-5 space-y-2.5">
        {data.receipt && (
          <Button asChild variant="outline" className="h-11 w-full">
            <a href={data.receipt} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              영수증 보기
            </a>
          </Button>
        )}

        {paid &&
          (data.cancelable ? (
            confirming ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center">
                <p className="text-sm">
                  정말 취소할까요?{" "}
                  <b>{data.amount.toLocaleString()}원 전액</b>이 환불되고 자리는
                  다른 분에게 돌아가요. 단체 신청은 주문 전체가 한 번에
                  취소돼요.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    className="h-10 flex-1"
                    disabled={canceling}
                    onClick={() => setConfirming(false)}
                  >
                    아니요
                  </Button>
                  <Button
                    variant="destructive"
                    className="h-10 flex-1"
                    disabled={canceling}
                    onClick={handleCancel}
                  >
                    {canceling ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "네, 취소할게요"
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="h-11 w-full text-muted-foreground hover:text-destructive"
                onClick={() => setConfirming(true)}
              >
                결제 취소 (전액 환불)
              </Button>
            )
          ) : (
            <p className="text-center text-xs leading-relaxed text-muted-foreground">
              직접 취소 기간(행사 7일 전)이 지났어요. 취소가 필요하면
              운영진에게 인스타그램 DM 으로 문의해주세요.
            </p>
          ))}

        {!paid && (
          <Button
            variant="outline"
            className="h-11 w-full"
            onClick={onResignup}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            다시 신청하기
          </Button>
        )}
      </div>

      {paid && data.cancelable && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          {formatDate(data.cancelableUntil)} 까지 직접 취소할 수 있어요.
        </p>
      )}
    </div>
  )
}
