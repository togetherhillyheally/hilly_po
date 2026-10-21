import { Suspense } from "react"
import type { Metadata } from "next"
import { SuccessClient } from "./SuccessClient"

export const metadata: Metadata = {
  title: "신청 완료 — 낯선곳으로",
  robots: { index: false, follow: false },
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6">
          <p className="text-sm text-muted-foreground">결제를 확인하고 있어요…</p>
        </main>
      }
    >
      <SuccessClient />
    </Suspense>
  )
}
