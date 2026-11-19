import Link from "next/link"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

/** 토스 결제 실패/취소 리다이렉트 — 사유를 보여주고 중계로 돌려보낸다 */
export default async function SponsorFailPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; code?: string; return?: string }>
}) {
  const sp = await searchParams
  const back = sp.return && sp.return.startsWith("/") && !sp.return.startsWith("//") ? sp.return : "/control"
  return (
    <main className="theme-light flex min-h-[100dvh] items-center justify-center bg-background px-6 text-foreground">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-8 text-center">
        <h1 className="text-xl font-bold">결제가 되지 않았어요</h1>
        <p className="mt-2 text-sm text-muted-foreground">{sp.message ?? "결제를 취소했거나 완료되지 않았어요."}</p>
        <Button asChild variant="outline" className="mt-5 w-full">
          <Link href={back}>중계로 돌아가기</Link>
        </Button>
      </div>
    </main>
  )
}
