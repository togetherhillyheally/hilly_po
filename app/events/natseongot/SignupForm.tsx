"use client"

import { useEffect, useRef, useState } from "react"
import { AlertCircle, CheckCircle2, Loader2, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  NATSEONGOT as EV,
  TOSS_CLIENT_KEY,
  callEventFn,
  partyPricing,
} from "@/lib/events"

type Participant = {
  name: string
  phone: string
  birth: string
  gender: string
  /** 뒤풀이 식사 참석 */
  dinner: boolean
}

const EMPTY_P: Participant = {
  name: "",
  phone: "",
  birth: "",
  gender: "",
  dinner: false,
}

type Fields = {
  email: string
  playStyle: string
  emergencyName: string
  emergencyRelation: string
  emergencyPhone: string
  experience: string
  note: string
}

const EMPTY: Fields = {
  email: "",
  playStyle: "",
  emergencyName: "",
  emergencyRelation: "",
  emergencyPhone: "",
  experience: "",
  note: "",
}

/** 조(2인) 편성 기준 — 같은 조는 페이스가 비슷해야 4시간이 즐겁다 */
const PACE = [
  "산에서 뛰는 게 편해요 — 트레일러닝 해봤어요",
  "빠른 걸음 — 20km+ 장거리 산행 경험 있어요",
  "보통 걸음 — 산행은 자주, 장거리는 아직이에요",
  "쉬엄쉬엄 — 등산이 아직 익숙하지 않아요",
] as const

/** 팀(4인) 궁합 기준 — 목표가 다른 사람끼리 묶이면 서로 괴롭다 */
const PLAY_STYLE = [
  "도전파 — 고득점, 정상석까지 노려요",
  "전략파 — 머리 쓰는 재미, 효율 좋은 동선으로",
  "소풍파 — 풍경 즐기며 걷다 오면 충분해요",
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
      "행사 운영과 조 편성을 위해 입력한 개인정보가 수집·이용되는 데 동의해요. (행사 종료 후 6개월 내 파기)",
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
  // 단체 신청 — 첫 번째가 대표(본인), 최대 EV.maxParty 명
  const [party, setParty] = useState<Participant[]>([{ ...EMPTY_P }])
  const [agree, setAgree] = useState({
    terms: false,
    privacy: false,
    photo: false,
  })
  const [status, setStatus] = useState<
    "idle" | "submitting" | "paying" | "widget" | "transfer" | "error"
  >("idle")
  const [message, setMessage] = useState("")
  const [orderId, setOrderId] = useState("")
  const [order, setOrder] = useState<{
    orderId: string
    amount: number
    orderName: string
  } | null>(null)
  const [widgetReady, setWidgetReady] = useState(false)
  const widgetsRef = useRef<import("./toss").TossWidgets | null>(null)

  // 결제위젯 렌더 — 신청서 접수(orderId 발급) 후 위젯 단계에서 1회
  useEffect(() => {
    if (status !== "widget" || !order) return
    let cancelled = false
    setWidgetReady(false)
    ;(async () => {
      try {
        const { loadTossPayments } = await import("./toss")
        const TossPayments = await loadTossPayments()
        const widgets = TossPayments(TOSS_CLIENT_KEY).widgets({
          customerKey: order.orderId,
        })
        await widgets.setAmount({ currency: "KRW", value: order.amount })
        if (cancelled) return
        await Promise.all([
          widgets.renderPaymentMethods({
            selector: "#toss-pm",
            variantKey: "DEFAULT",
          }),
          widgets.renderAgreement({ selector: "#toss-agree" }),
        ])
        if (cancelled) return
        widgetsRef.current = widgets
        setWidgetReady(true)
      } catch (err) {
        if (cancelled) return
        setMessage(
          err instanceof Error ? err.message : "결제 모듈을 불러오지 못했어요."
        )
        setStatus("error")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [status, order])

  async function handlePay() {
    const widgets = widgetsRef.current
    if (!widgets || !order) return
    try {
      const origin = window.location.origin
      await widgets.requestPayment({
        orderId: order.orderId,
        orderName: order.orderName,
        successUrl: `${origin}${EV.path}/success`,
        failUrl: `${origin}${EV.path}/fail`,
        customerEmail: f.email,
        customerName: party[0]?.name ?? "",
        customerMobilePhone: (party[0]?.phone ?? "").replace(/\D/g, ""),
      })
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "결제를 완료하지 못했어요."
      if (msg.includes("USER_CANCEL") || msg.includes("취소")) return
      setMessage(msg)
      setStatus("error")
    }
  }

  // 로그인 계정의 전화번호를 자동 입력 (비워져 있을 때만 — 수정 가능)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { getSupabase } = await import("@/lib/supabase/client")
      const {
        data: { user },
      } = await getSupabase().auth.getUser()
      if (cancelled || !user?.phone) return
      const digits = user.phone.replace(/\D/g, "")
      const local = digits.startsWith("82") ? "0" + digits.slice(2) : digits
      setParty((list) =>
        list[0]?.phone ? list : [{ ...list[0], phone: local }, ...list.slice(1)]
      )
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const set =
    (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setF((p) => ({ ...p, [k]: e.target.value }))

  const setP = <K extends keyof Participant>(
    i: number,
    k: K,
    v: Participant[K]
  ) =>
    setParty((list) =>
      list.map((p, idx) => (idx === i ? { ...p, [k]: v } : p))
    )

  const pricing = partyPricing(party.length)

  const busy = status === "submitting" || status === "paying"
  const partyValid = party.every(
    (p) =>
      p.name.trim().length >= 2 &&
      p.phone.replace(/\D/g, "").length >= 10 &&
      p.birth.replace(/\D/g, "").length === 8 &&
      p.gender !== ""
  )
  const canSubmit =
    partyValid &&
    f.email.includes("@") &&
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
        participants: party,
        ...f,
        agreePhoto: agree.photo,
      })
      setOrderId(created.orderId)

      // 결제위젯 단계로 — gck(위젯) 키는 payment() 가 아니라 widgets() 만 지원
      setOrder(created)
      setStatus("widget")
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

  if (status === "widget") {
    return (
      <div className="py-2">
        <h3 className="text-lg font-semibold tracking-tight">
          결제 수단을 선택해주세요
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {EV.title} 참가비{" "}
          <b className="text-foreground tabular-nums">
            {(order?.amount ?? pricing.total).toLocaleString()}원
          </b>
        </p>
        {/* 토스 결제위젯 영역 — 위젯이 밝은 배경 기준이라 흰 카드로 감쌈 */}
        <div className="mt-4 overflow-hidden rounded-xl bg-white">
          <div id="toss-pm" />
          <div id="toss-agree" />
        </div>
        {!widgetReady && (
          <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            결제 수단을 불러오는 중…
          </p>
        )}
        <Button
          type="button"
          disabled={!widgetReady}
          onClick={handlePay}
          className="mt-4 h-12 w-full bg-[#DC2F55] text-base text-white hover:bg-[#DC2F55]/90"
        >
          <Lock className="mr-2 h-4 w-4" />
          {(order?.amount ?? pricing.total).toLocaleString()}원 결제하기
        </Button>
      </div>
    )
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
              {pricing.total.toLocaleString()}원
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">입금자명</dt>
            <dd className="font-semibold">{party[0]?.name}</dd>
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
          <SectionTitle n={1}>
            참가자 정보
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              최대 {EV.maxParty}명 단체 신청
            </span>
          </SectionTitle>
          <div className="space-y-4">
            {party.map((p, i) => (
              <div key={i} className="rounded-xl border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold">
                    {i === 0 ? "대표 신청자 (본인)" : `참가자 ${i + 1}`}
                  </span>
                  {i > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setParty((list) => list.filter((_, idx) => idx !== i))
                      }
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      삭제
                    </button>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="이름" required>
                    <Input
                      value={p.name}
                      onChange={(e) => setP(i, "name", e.target.value)}
                      placeholder="홍길동"
                    />
                  </Field>
                  <Field label="연락처" required>
                    <Input
                      value={p.phone}
                      onChange={(e) => setP(i, "phone", e.target.value)}
                      placeholder="010-0000-0000"
                      inputMode="tel"
                    />
                  </Field>
                  <Field label="생년월일" required>
                    <Input
                      value={p.birth}
                      onChange={(e) => setP(i, "birth", e.target.value)}
                      placeholder="19900101"
                      inputMode="numeric"
                      maxLength={8}
                    />
                  </Field>
                  <Field label="성별" required>
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
                          onClick={() => setP(i, "gender", g)}
                        >
                          {g}
                        </Button>
                      ))}
                    </div>
                  </Field>
                </div>
              </div>
            ))}
            {party.length < EV.maxParty && (
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full border-dashed"
                onClick={() => setParty((list) => [...list, { ...EMPTY_P }])}
              >
                + 참가자 추가 ({party.length}/{EV.maxParty}명) — 2인·4인은 10%
                할인
              </Button>
            )}
            <Field label="이메일 (대표자)" required>
              <Input
                type="email"
                value={f.email}
                onChange={set("email")}
                placeholder="hello@example.com"
              />
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
            페이스 & 플레이 스타일
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              조 편성과 팀 배정에 그대로 써요
            </span>
          </SectionTitle>

          <p className="mb-2 text-sm font-medium">
            우리의 산 페이스는?
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              같은 조(2인)는 페이스가 비슷해야 4시간이 즐거워요
            </span>
          </p>
          <div className="space-y-2">
            {PACE.map((opt) => (
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

          <p className="mb-2 mt-6 text-sm font-medium">
            이날의 목표는?
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              비슷한 목표의 팀끼리 묶어드려요
            </span>
          </p>
          <div className="space-y-2">
            {PLAY_STYLE.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setF((p) => ({ ...p, playStyle: opt }))}
                className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                  f.playStyle === opt
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

        {/* 뒤풀이 */}
        <section>
          <div className="rounded-xl border p-4">
            <p className="text-sm leading-relaxed">
              <b className="font-semibold">🍲 뒤풀이 식사 (17:30)</b>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                행사 후{" "}
                <a
                  href="https://naver.me/F3Tj4xUX"
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2"
                >
                  자선농원
                </a>
                에서 소감 나누며 저녁을 같이 먹어요. 참석할 분을 체크해주세요.
              </span>
            </p>
            <div className="mt-3 space-y-2">
              {party.map((p, i) => (
                <label
                  key={i}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors hover:border-foreground/20"
                >
                  <Checkbox
                    checked={p.dinner}
                    onCheckedChange={(v) => setP(i, "dinner", v === true)}
                    className="data-[state=checked]:border-[#DC2F55] data-[state=checked]:bg-[#DC2F55]"
                  />
                  <span className="font-medium">
                    {p.name.trim() ||
                      (i === 0 ? "대표 신청자" : `참가자 ${i + 1}`)}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {p.dinner ? "참석" : "불참"}
                  </span>
                </label>
              ))}
            </div>
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

        {/* 결제 — 시트 하단 고정 (스크롤해도 항상 보임) */}
        <section className="sticky -bottom-6 -mx-6 border-t bg-background px-6 pb-5 pt-4">
          <div className="mb-1.5 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              참가비 {EV.fee.toLocaleString()}원 × {party.length}명
            </span>
            {pricing.discounted && (
              <span className="font-medium text-[#DC2F55]">
                {party.length}인 신청 10% 할인
              </span>
            )}
          </div>
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">총 결제 금액</span>
            <span className="text-2xl font-bold tabular-nums">
              {pricing.total.toLocaleString()}
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
