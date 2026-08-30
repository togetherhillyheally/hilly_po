import Link from "next/link"
import { Suspense } from "react"
import { PhoneOtpForm } from "@/components/auth/PhoneOtpForm"

export const metadata = {
  title: "로그인 · 힐리힐리 MAP",
}

export default function LoginPage() {
  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center px-6">
      {/* 상단 은은한 브랜드 틴트 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[45dvh] bg-[radial-gradient(60%_100%_at_50%_0%,rgba(220,47,85,0.10),transparent_70%)]" />

      <div className="relative w-full max-w-sm">
        <Link
          href="/"
          className="block text-center text-sm font-bold tracking-tight"
        >
          HILLY HEALLY <span className="text-muted-foreground">GROUND</span>
        </Link>

        <div className="mt-8 rounded-2xl border bg-card p-8">
          <div className="space-y-2 text-center">
            <h1 className="text-xl font-bold">휴대폰 번호로 시작하기</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              힐리힐리 앱과 같은 번호로 로그인하면
              <br />
              만든 지도가 내 계정에 연결돼요.
            </p>
          </div>
          <div className="mt-8">
            <Suspense>
              <PhoneOtpForm />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  )
}
