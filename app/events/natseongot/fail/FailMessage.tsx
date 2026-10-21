"use client"

import { useSearchParams } from "next/navigation"

export function FailMessage() {
  const sp = useSearchParams()
  const message = sp.get("message")
  const code = sp.get("code")

  return (
    <>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {message ?? "결제가 취소되었거나 중간에 중단됐어요."}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        신청서는 저장돼 있으니 다시 결제만 진행하면 돼요.
        {code ? ` (${code})` : ""}
      </p>
    </>
  )
}
