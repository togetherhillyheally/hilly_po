import { Suspense } from "react"
import { PhoneOtpForm } from "@/components/auth/PhoneOtpForm"

export const metadata = {
  title: "로그인 — 힐리힐리 지도만들기",
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">휴대폰 번호로 시작하기</h1>
          <p className="text-sm text-muted-foreground">
            힐리힐리 앱과 같은 번호로 로그인하면 만든 지도가 내 계정에
            연결돼요.
          </p>
        </div>
        <Suspense>
          <PhoneOtpForm />
        </Suspense>
      </div>
    </main>
  )
}
