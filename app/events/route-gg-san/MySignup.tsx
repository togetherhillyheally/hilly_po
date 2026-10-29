"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  Pencil,
  RotateCcw,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NATSEONGOT as EV, callEventFn, formatPhone } from "@/lib/events"

type EditableParticipant = {
  name: string
  phone: string
  birth: string
  gender: string
  dinner?: boolean
}

export type MySignupData = {
  orderId: string
  /** 보여주는 신청번호 (ROUTE-GG-001) — 결제 확정 때 부여, 그 전 주문은 null */
  signupNo?: string | null
  name: string
  names?: string[]
  participants?: EditableParticipant[]
  partySize?: number
  amount: number
  status: "paid" | "canceled"
  paidAt: string | null
  canceledAt: string | null
  dinner?: boolean
  dinnerCount?: number
  receipt: string | null
  createdAt?: string
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
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<EditableParticipant[]>([])
  const [saving, setSaving] = useState(false)
  const paid = data.status === "paid"
  const dinnerNames = (data.participants ?? [])
    .filter((p) => p.dinner)
    .map((p) => p.name)
  const dinnerLabel = data.participants?.some((p) => "dinner" in p)
    ? dinnerNames.length > 0
      ? `${dinnerNames.length}명 참석 (${dinnerNames.join(", ")})`
      : "불참"
    : data.dinner
      ? "참석"
      : "불참"

  const startEdit = () => {
    setDraft(
      (data.participants ?? []).map((p) => ({
        ...p,
        phone: p.phone ?? "",
        birth: p.birth ?? "",
        gender: p.gender ?? "",
        dinner: p.dinner === true,
      }))
    )
    setEditing(true)
  }

  const setD = <K extends keyof EditableParticipant>(
    i: number,
    k: K,
    v: EditableParticipant[K]
  ) =>
    setDraft((list) =>
      list.map((p, idx) => (idx === i ? { ...p, [k]: v } : p))
    )

  async function handleSave() {
    setSaving(true)
    try {
      await callEventFn<{ success: boolean }>({
        action: "update",
        eventSlug: EV.slug,
        participants: draft,
      })
      toast.success("신청 정보를 수정했어요.")
      setEditing(false)
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "수정에 실패했어요.")
    } finally {
      setSaving(false)
    }
  }

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

  if (editing) {
    return (
      <div className="py-4">
        <h3 className="text-lg font-semibold tracking-tight">
          참가자 정보 수정
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          인원수 변경은 금액이 달라져 취소 후 재신청이 필요해요.
          <br />
          사람을 바꾸는 건 여기서 바로 돼요.
        </p>
        <div className="mt-4 space-y-4">
          {draft.map((p, i) => (
            <div key={i} className="rounded-xl border p-4">
              <p className="mb-3 text-sm font-semibold">
                {i === 0 ? "대장" : `참가자 ${i + 1}`}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  value={p.name}
                  onChange={(e) => setD(i, "name", e.target.value)}
                  placeholder="이름"
                />
                <Input
                  value={formatPhone(p.phone)}
                  onChange={(e) => setD(i, "phone", formatPhone(e.target.value))}
                  placeholder="연락처 010-0000-0000"
                  inputMode="tel"
                />
                <Input
                  value={p.birth}
                  onChange={(e) => setD(i, "birth", e.target.value)}
                  placeholder="생년월일 19900101"
                  inputMode="numeric"
                  maxLength={8}
                />
                <div className="grid grid-cols-2 gap-2">
                  {["남", "여"].map((g) => (
                    <Button
                      key={g}
                      type="button"
                      variant={p.gender === g ? "default" : "outline"}
                      className={
                        p.gender === g
                          ? "bg-[#DC2F55] text-white hover:bg-[#DC2F55]/90"
                          : ""
                      }
                      onClick={() => setD(i, "gender", g)}
                    >
                      {g}
                    </Button>
                  ))}
                </div>
              </div>
              <label className="mt-3 flex cursor-pointer items-center gap-2.5 border-t pt-3 text-sm">
                <input
                  type="checkbox"
                  checked={p.dinner === true}
                  onChange={(e) => setD(i, "dinner", e.target.checked)}
                  className="h-4 w-4 accent-[#DC2F55]"
                />
                🍲 뒤풀이 식사 참석
                <span className="text-xs text-muted-foreground">
                  18:30 자선농원
                </span>
              </label>
            </div>
          ))}
        </div>
        <div className="mt-5 flex gap-2">
          <Button
            variant="outline"
            className="h-11 flex-1"
            disabled={saving}
            onClick={() => setEditing(false)}
          >
            취소
          </Button>
          <Button
            className="h-11 flex-1 bg-[#DC2F55] text-white hover:bg-[#DC2F55]/90"
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "저장"
            )}
          </Button>
        </div>
      </div>
    )
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
          <dt className="shrink-0 text-muted-foreground">이벤트</dt>
          <dd className="text-right font-semibold">{EV.title}</dd>
        </div>
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
        <div className="flex justify-between gap-6">
          <dt className="shrink-0 text-muted-foreground">뒤풀이 식사 (18:30)</dt>
          <dd className="text-right font-semibold">
            {dinnerLabel}
          </dd>
        </div>
        <div className="flex justify-between border-t pt-3">
          <dt className="text-muted-foreground">신청번호</dt>
          <dd
            className={
              data.signupNo
                ? "font-mono text-sm font-semibold"
                : "font-mono text-xs text-muted-foreground"
            }
          >
            {data.signupNo || data.orderId}
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

        {paid && (data.participants?.length ?? 0) > 0 && (
          <Button variant="outline" className="h-11 w-full" onClick={startEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            참가자와 뒤풀이 정보 수정
          </Button>
        )}

        {paid &&
          (data.cancelable ? (
            confirming ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center">
                <p className="text-sm leading-relaxed">
                  <b>정말 취소할까요?</b>
                  <br />
                  <b>{data.amount.toLocaleString()}원 전액</b>이 환불돼요.
                  <br />
                  자리는 다른 분에게 돌아가요.
                  <br />
                  단체 신청은 주문 전체가 한 번에 취소돼요.
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
              직접 취소 기간(행사 7일 전)이 지났어요.
              <br />
              취소가 필요하면 운영진에게 인스타그램 DM으로 문의해주세요.
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
