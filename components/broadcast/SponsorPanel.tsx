"use client"

import { useEffect, useState } from "react"
import { HandCoins, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCurrentUser } from "@/hooks/use-current-user"
import { broadcastRepo } from "@/lib/repos/broadcastRepo"
import type { PublicBroadcast, SponsorPublic } from "@/lib/repos/broadcastTypes"
import { LoginPrompt } from "./ChatComposer"
import SponsorDialog from "./SponsorDialog"

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`

/**
 * 후원 탭 — 합계·인원·TOP 3, 최근 후원 목록, 후원하기.
 * 토스 상품 심사 전(sponsor_payments_enabled=false)엔 상품 설명은 그대로 보이고 결제 버튼만 "준비 중".
 */
export default function SponsorPanel({
  broadcast,
  isHost,
  className,
}: {
  broadcast: PublicBroadcast
  isHost: boolean
  className?: string
}) {
  const { user } = useCurrentUser()
  const [recent, setRecent] = useState<SponsorPublic[]>([])
  const [open, setOpen] = useState(false)
  const live = broadcast.status === "live"
  const feePct = Math.round(broadcast.sponsor_fee_rate * 100)

  useEffect(() => {
    let cancelled = false
    broadcastRepo
      .sponsors(broadcast.id)
      .then((rows) => !cancelled && setRecent(rows))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [broadcast.id, broadcast.sponsor_count])

  const hostName = broadcast.host?.nickname ?? "도전자"

  return (
    <div className={"flex min-h-0 flex-1 flex-col " + (className ?? "")}>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* 합계 */}
        <div className="border-b px-4 py-3">
          <p className="text-[11px] font-semibold text-muted-foreground">
            {hostName}님에게 모인 응원
          </p>
          <p className="mt-0.5 text-2xl font-extrabold tabular-nums">
            {won(broadcast.sponsor_total)}
            <span className="ml-1.5 text-sm font-semibold text-muted-foreground">
              {broadcast.sponsor_count}명
            </span>
          </p>
          {broadcast.top_sponsors.length > 0 && (
            <ol className="mt-2 flex flex-wrap gap-1.5">
              {broadcast.top_sponsors.map((s, i) => (
                <li
                  key={i}
                  className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900 dark:bg-amber-900/30 dark:text-amber-200"
                >
                  <span className="font-extrabold">{i + 1}</span>
                  {s.display_name}
                  <span className="tabular-nums opacity-80">{won(s.amount)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* 최근 후원 */}
        {recent.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-muted-foreground">
            아직 후원이 없어요. 첫 번째 응원을 보내 보세요.
          </p>
        ) : (
          <ul className="divide-y">
            {recent.map((s, i) => (
              <li key={s.id ?? i} className="px-4 py-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-bold">{s.display_name}</span>
                  <span className="shrink-0 text-sm font-extrabold tabular-nums text-amber-600">
                    {won(s.amount)}
                  </span>
                </div>
                {s.message && <p className="mt-0.5 text-xs leading-snug text-foreground/80">{s.message}</p>}
              </li>
            ))}
          </ul>
        )}

        {/* 상품 설명 — 심사·고지용으로 항상 노출 */}
        <div className="mx-4 my-3 rounded-xl bg-muted/60 p-3 text-[11px] leading-relaxed text-muted-foreground">
          <p className="font-semibold text-foreground/80">후원 안내</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            <li>1,000원부터 500,000원까지 카드·간편결제로 후원할 수 있어요.</li>
            <li>힐리힐리가 받아 플랫폼 수수료 {feePct}%를 제하고 도전자에게 정산해요.</li>
            <li>후원은 디지털 응원이라 결제 후 환불되지 않아요(결제 오류는 고객센터).</li>
            <li>메시지는 중계 채팅에 공개돼요. 익명을 고르면 이름이 숨겨져요.</li>
          </ul>
        </div>
      </div>

      <div className="border-t px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {!live ? (
          <p className="rounded-xl bg-muted px-3 py-2.5 text-center text-xs text-muted-foreground">
            끝난 중계예요. 후원 내역만 볼 수 있어요.
          </p>
        ) : isHost ? (
          <p className="rounded-xl bg-muted px-3 py-2.5 text-center text-xs text-muted-foreground">
            내 중계예요. 후원이 들어오면 여기에 쌓여요.
          </p>
        ) : !broadcast.sponsor_payments_enabled ? (
          <Button disabled className="w-full" variant="outline">
            <Lock className="mr-1.5 h-4 w-4" />
            후원 결제 준비 중 — 곧 열려요
          </Button>
        ) : !user ? (
          <LoginPrompt text="후원하려면 로그인해 주세요" />
        ) : (
          <Button
            className="w-full bg-amber-500 text-white hover:bg-amber-500/90"
            onClick={() => setOpen(true)}
          >
            <HandCoins className="mr-1.5 h-4 w-4" />
            {hostName}님 후원하기
          </Button>
        )}
      </div>

      <SponsorDialog broadcast={broadcast} open={open} onOpenChange={setOpen} />
    </div>
  )
}
