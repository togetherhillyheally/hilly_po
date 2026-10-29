import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NATSEONGOT as EV } from "@/lib/events"
import { SiteHeader } from "@/components/layout/SiteHeader"
import { FailMessage } from "./FailMessage"

export const metadata: Metadata = {
  title: "결제 실패 — ROUTE @광교산",
  robots: { index: false, follow: false },
}

export default function Page() {
  return (
    <>
      {/* 사이트 공통 헤더 — 본문 컨테이너 밖 */}
      <SiteHeader />
    <main className="event-readable mx-auto max-w-6xl break-keep px-6">

      <div className="flex min-h-[70dvh] items-center justify-center py-12">
        <div className="w-full max-w-lg rounded-2xl border bg-card p-10 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <XCircle
              className="h-7 w-7 text-muted-foreground"
              strokeWidth={1.5}
            />
          </span>
          <h1 className="mt-5 text-xl font-bold tracking-tighter">
            결제가 완료되지 않았어요
          </h1>
          <Suspense
            fallback={
              <p className="mt-2 text-sm text-muted-foreground">
                다시 시도해주세요.
              </p>
            }
          >
            <FailMessage />
          </Suspense>
          <Button
            asChild
            className="mt-7 h-12 w-full bg-[#DC2F55] text-base text-white hover:bg-[#DC2F55]/90"
          >
            <Link href={`${EV.path}#signup`}>다시 신청하기</Link>
          </Button>
          <p className="mt-5 text-xs text-muted-foreground">
            계속 실패하면 힐리힐리 인스타그램 DM으로 알려주세요.
          </p>
        </div>
      </div>
    </main>
    </>
  )
}
