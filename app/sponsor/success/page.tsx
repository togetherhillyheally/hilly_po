import { Suspense } from "react"
import { SponsorSuccessClient } from "./SponsorSuccessClient"

export const dynamic = "force-dynamic"

/** 토스 결제 성공 리다이렉트 — 서버에서 승인하고 원래 중계 페이지로 돌아간다 */
export default function SponsorSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="theme-light flex min-h-[100dvh] items-center justify-center bg-background text-sm text-muted-foreground">
          결제를 확인하고 있어요…
        </main>
      }
    >
      <SponsorSuccessClient />
    </Suspense>
  )
}
