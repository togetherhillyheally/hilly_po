import type { Metadata } from "next"
import type { ReactNode } from "react"
import { MapsHeader } from "@/components/layout/MapsHeader"

// 슈퍼관리자 전용 영역 — 검색 색인 제외
export const metadata: Metadata = {
  title: "관제 · 힐리힐리 LIVE",
  description: "트래커 이벤트와 모험 라이브를 실시간으로 관제해요.",
  robots: { index: false, follow: false },
}

export default function ControlLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh]">
      <MapsHeader />
      {children}
    </div>
  )
}
