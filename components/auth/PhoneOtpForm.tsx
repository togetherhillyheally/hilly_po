"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { getSupabase } from "@/lib/supabase/client"
import {
  formatTimer,
  isValidKoreanMobile,
  maskPhone,
  normalizePhone,
  toE164,
} from "@/lib/phone"

const RESEND_COOLDOWN_S = 60

export function PhoneOtpForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState<"phone" | "otp">("phone")
  const [phoneInput, setPhoneInput] = useState("")
  const [otp, setOtp] = useState("")
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const digits = normalizePhone(phoneInput)
  const phoneValid = isValidKoreanMobile(digits)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  function startCooldown() {
    setCooldown(RESEND_COOLDOWN_S)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1 && timerRef.current) clearInterval(timerRef.current)
        return Math.max(0, s - 1)
      })
    }, 1000)
  }

  async function sendOtp() {
    if (!phoneValid || busy) return
    setBusy(true)
    const { error } = await getSupabase().auth.signInWithOtp({
      phone: toE164(digits),
    })
    setBusy(false)
    if (error) {
      toast.error("인증번호 전송에 실패했어요. 잠시 후 다시 시도해 주세요.")
      return
    }
    setStep("otp")
    setOtp("")
    startCooldown()
    toast.success("인증번호를 보냈어요.")
  }

  async function verifyOtp(code: string) {
    if (busy) return
    setBusy(true)
    const { error } = await getSupabase().auth.verifyOtp({
      phone: toE164(digits),
      token: code,
      type: "sms",
    })
    setBusy(false)
    if (error) {
      toast.error("인증번호가 올바르지 않아요.")
      setOtp("")
      return
    }
    const next = searchParams.get("next")
    router.replace(next && next.startsWith("/") ? next : "/maps")
    router.refresh()
  }

  if (step === "phone") {
    return (
      <form
        className="w-full space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          sendOtp()
        }}
      >
        <Input
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="휴대폰 번호 (010-0000-0000)"
          value={phoneInput}
          onChange={(e) => setPhoneInput(e.target.value)}
          className="h-12 text-base"
          autoFocus
        />
        <Button
          type="submit"
          className="h-12 w-full text-base"
          disabled={!phoneValid || busy}
        >
          {busy ? "전송 중…" : "인증번호 받기"}
        </Button>
      </form>
    )
  }

  return (
    <div className="w-full space-y-4">
      <p className="text-center text-sm text-muted-foreground">
        {maskPhone(digits)} 로 보낸 6자리 인증번호를 입력해 주세요
      </p>
      <div className="flex justify-center">
        <InputOTP
          maxLength={6}
          value={otp}
          onChange={(value) => {
            setOtp(value)
            if (value.length === 6) verifyOtp(value)
          }}
          disabled={busy}
          autoFocus
        >
          <InputOTPGroup>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <InputOTPSlot key={i} index={i} className="h-12 w-12 text-lg" />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>
      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          className="text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => setStep("phone")}
        >
          번호 다시 입력
        </button>
        <button
          type="button"
          className="text-muted-foreground underline-offset-4 hover:underline disabled:opacity-50"
          disabled={cooldown > 0 || busy}
          onClick={sendOtp}
        >
          {cooldown > 0 ? `재전송 ${formatTimer(cooldown)}` : "인증번호 재전송"}
        </button>
      </div>
    </div>
  )
}
