"use client"

import { useState } from "react"
import { AlertCircle, CheckCircle2, Loader2, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { NATSEONGOT as EV, callEventFn } from "@/lib/events"

type Fields = {
  name: string
  phone: string
  email: string
  birth: string
  gender: string
  emergencyName: string
  emergencyRelation: string
  emergencyPhone: string
  experience: string
  note: string
}

const EMPTY: Fields = {
  name: "",
  phone: "",
  email: "",
  birth: "",
  gender: "",
  emergencyName: "",
  emergencyRelation: "",
  emergencyPhone: "",
  experience: "",
  note: "",
}

const EXPERIENCE = [
  "트레일러닝 대회 완주 경험 있어요",
  "장거리 산행(20km+) 경험 있어요",
  "산행은 자주 하지만 장거리는 처음이에요",
  "러닝은 하지만 산은 많지 않아요",
] as const

const AGREEMENTS = [
  {
    key: "terms" as const,
    required: true,
    label:
      "산행 중 발생할 수 있는 위험을 이해하고, 운영진의 안전 수칙(2인 1조 이동·귀환 시각)을 따를게요.",
  },
  {
    key: "privacy" as const,
    required: true,
    label:
      "행사 운영과 상해보험 가입을 위해 입력한 개인정보가 수집·이용되는 데 동의해요. (행사 종료 후 6개월 내 파기)",
  },
  {
    key: "photo" as const,
    required: false,
    label:
      "현장에서 촬영된 사진·영상이 기록 콘텐츠로 사용되는 데 동의해요. (선택)",
  },
]

export function SignupForm() {
  const [f, setF] = useState<Fields>(EMPTY)
  const [agree, setAgree] = useState({
    terms: false,
    privacy: false,
    photo: false,
  })
  const [status, setStatus] = useState<
    "idle" | "submitting" | "paying" | "transfer" | "error"
  >("idle")
  const [message, setMessage] = useState("")
  const [orderId, setOrderId] = useState("")

  const set =
    (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setF((p) => ({ ...p, [k]: e.target.value }))

  const busy = status === "submitting" || status === "paying"
  const canSubmit =
    f.name.trim().length >= 2 &&
    f.phone.replace(/\D/g, "").length >= 10 &&
    f.email.includes("@") &&
    f.birth.replace(/\D/g, "").length === 8 &&
    f.gender !== "" &&
    f.emergencyName.trim().length >= 2 &&
    f.emergencyPhone.replace(/\D/g, "").length >= 10 &&
    agree.terms &&
    agree.privacy &&
    !busy

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setStatus("submitting")
    setMessage("")

    try {
      const created = await callEventFn<{
        orderId: string
        amount: number
        orderName: string
      }>({
        action: "create",
        eventSlug: EV.slug,
        ...f,
        agreePhoto: agree.photo,
      })
      setOrderId(created.orderId)

      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY
      if (!clientKey) {
        setStatus("transfer")
        return
      }

      setStatus("paying")
      const { loadTossPayments } = await import("./toss")
      const TossPayments = await loadTossPayments()
      const payment = TossPayments(clientKey).payment({
        customerKey: created.orderId,
      })
      const origin = window.location.origin
      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: created.amount },
        orderId: created.orderId,
        orderName: created.orderName,
        successUrl: `${origin}${EV.path}/success`,
        failUrl: `${origin}${EV.path}/fail`,
        customerEmail: f.email,
        customerName: f.name,
        customerMobilePhone: f.phone.replace(/\D/g, ""),
        card: {
          useEscrow: false,
          flowMode: "DEFAULT",
          useCardPoint: false,
          useAppCardOnly: false,
        },
      })
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "문제가 생겼어요. 다시 시도해주세요."
      if (msg.includes("USER_CANCEL") || msg.includes("취소")) {
        setStatus("idle")
        return
      }
      setMessage(msg)
      setStatus("error")
    }
  }

  if (status === "transfer") {
    return (
      <div className="py-6 text-center">
        <CheckCircle2
          className="mx-auto h-10 w-10 text-[#DC2F55]"
          strokeWidth={1.5}
        />
        <h3 className="mt-5 text-xl font-semibold tracking-tight">
          신청서가 접수됐어요
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          아래 계좌로 참가비를 입금해주시면 신청이 확정돼요.
          <br />
          입금 확인 후 문자로 안내드릴게요.
        </p>
        <dl className="mt-6 space-y-3 rounded-xl border bg-background p-5 text-left text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">입금 계좌</dt>
            <dd className="font-semibold">계좌 정보 안내 예정</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">입금 금액</dt>
            <dd className="font-semibold text-[#DC2F55] tabular-nums">
              {EV.fee.toLocaleString()}원
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">입금자명</dt>
            <dd className="font-semibold">{f.name}</dd>
          </div>
          <div className="flex justify-between border-t pt-3">
            <dt className="text-muted-foreground">신청번호</dt>
            <dd className="font-mono text-xs text-muted-foreground">
              {orderId}
            </dd>
          </div>
        </dl>
        <p className="mt-5 text-xs text-muted-foreground">
          문의 — 힐리힐리 인스타그램 DM
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-8">
        {/* 1. 참가자 */}
        <section>
          <SectionTitle n={1}>참가자 정보</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="이름" required>
              <Input value={f.name} onChange={set("name")} placeholder="홍길동" />
            </Field>
            <Field label="연락처" required>
              <Input
                value={f.phone}
                onChange={set("phone")}
                placeholder="010-0000-0000"
                inputMode="tel"
              />
            </Field>
            <Field label="이메일" required className="sm:col-span-2">
              <Input
                type="email"
                value={f.email}
                onChange={set("email")}
                placeholder="hello@example.com"
              />
            </Field>
            <Field label="생년월일 (보험 가입용)" required>
              <Input
                value={f.birth}
                onChange={set("birth")}
                placeholder="19900101"
                inputMode="numeric"
                maxLength={8}
              />
            </Field>
            <Field label="성별 (보험 가입용)" required>
              <div className="grid grid-cols-2 gap-2">
                {["남", "여"].map((g) => (
                  <Button
                    key={g}
                    type="button"
                    variant={f.gender === g ? "default" : "outline"}
                    className={
                      f.gender === g
                        ? "bg-[#DC2F55] text-white hover:bg-[#DC2F55]/90"
                        : ""
                    }
                    onClick={() => setF((p) => ({ ...p, gender: g }))}
                  >
                    {g}
                  </Button>
                ))}
              </div>
            </Field>
          </div>
        </section>

        {/* 2. 비상 연락처 */}
        <section>
          <SectionTitle n={2}>비상 연락처</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="이름" required>
              <Input
                value={f.emergencyName}
                onChange={set("emergencyName")}
                placeholder="보호자 성함"
              />
            </Field>
            <Field label="관계">
              <Input
                value={f.emergencyRelation}
                onChange={set("emergencyRelation")}
                placeholder="배우자 / 부모"
              />
            </Field>
            <Field label="연락처" required>
              <Input
                value={f.emergencyPhone}
                onChange={set("emergencyPhone")}
                placeholder="010-0000-0000"
                inputMode="tel"
              />
            </Field>
          </div>
        </section>

        {/* 3. 경험 */}
        <section>
          <SectionTitle n={3}>
            산행·러닝 경험
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              팀 배정에 참고해요
            </span>
          </SectionTitle>
          <div className="space-y-2">
            {EXPERIENCE.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setF((p) => ({ ...p, experience: opt }))}
                className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                  f.experience === opt
                    ? "border-[#DC2F55]/50 bg-[#DC2F55]/5 font-medium"
                    : "hover:border-foreground/20"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          <div className="mt-4">
            <Field label="하고 싶은 말 (선택)">
              <Input
                value={f.note}
                onChange={set("note")}
                placeholder="함께 신청한 일행, 알레르기, 궁금한 점 등"
              />
            </Field>
          </div>
        </section>

        {/* 4. 동의 */}
        <section>
          <SectionTitle n={4}>확인과 동의</SectionTitle>
          <div className="space-y-2.5">
            {AGREEMENTS.map((a) => (
              <label
                key={a.key}
                className="flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors hover:border-foreground/20"
              >
                <Checkbox
                  checked={agree[a.key]}
                  onCheckedChange={(v) =>
                    setAgree((p) => ({ ...p, [a.key]: v === true }))
                  }
                  className="mt-0.5 data-[state=checked]:border-[#DC2F55] data-[state=checked]:bg-[#DC2F55]"
                />
                <span className="text-xs leading-relaxed text-muted-foreground">
                  {a.required && (
                    <b className="mr-1 font-semibold text-[#DC2F55]">[필수]</b>
                  )}
                  {a.label}
                </span>
              </label>
            ))}
          </div>
        </section>

        {status === "error" && (
          <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <span className="text-xs leading-relaxed text-destructive">
              {message}
            </span>
          </div>
        )}

        {/* 결제 */}
        <section className="border-t pt-6">
          <div className="mb-5 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">참가비</span>
            <span className="text-2xl font-bold tabular-nums">
              {EV.fee.toLocaleString()}
              <span className="ml-1 text-sm font-medium text-muted-foreground">
                원
              </span>
            </span>
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={!canSubmit}
            className="h-12 w-full bg-[#DC2F55] text-base text-white hover:bg-[#DC2F55]/90"
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {status === "paying" ? "결제창을 여는 중" : "신청서 저장 중"}
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                신청하고 결제하기
              </>
            )}
          </Button>
          <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
            결제 후 행사 7일 전까지 전액 환불돼요. 이후에는 준비 비용이 발생해
            환불이 어려울 수 있어요.
          </p>
        </section>
      </div>
    </form>
  )
}

function SectionTitle({
  n,
  children,
}: {
  n: number
  children: React.ReactNode
}) {
  return (
    <h3 className="mb-5 flex items-center gap-2 text-sm font-semibold">
      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#DC2F55]/10 text-[10px] font-bold text-[#DC2F55]">
        {n}
      </span>
      {children}
    </h3>
  )
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string
  required?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={className}>
      <Label className="mb-2 block text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-[#DC2F55]">*</span>}
      </Label>
      {children}
    </div>
  )
}
