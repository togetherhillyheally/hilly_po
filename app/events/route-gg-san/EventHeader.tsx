"use client"

import { useRef } from "react"
import { Ticket } from "lucide-react"
import { SiteHeader } from "@/components/layout/SiteHeader"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { SignupSheet } from "./SignupSheet"

/** 이벤트 페이지 헤더 — 공통 SiteHeader 그대로, 프로필 메뉴에만 "신청 내역" 추가 (신청하기는 본문에) */
export function EventHeader() {
  const historyTriggerRef = useRef<HTMLButtonElement>(null)
  return (
    <>
      {/* 신청 내역 메뉴에서 여는 숨은 트리거 — 드롭다운 밖에 있어야 메뉴가 닫혀도 시트가 유지된다 */}
      <SignupSheet intent="history">
        <button ref={historyTriggerRef} className="hidden" aria-hidden />
      </SignupSheet>
      <SiteHeader
        menuItems={
          <DropdownMenuItem
            className="cursor-pointer"
            onSelect={() => {
              // 드롭다운이 닫힌 뒤 시트를 열어야 포커스가 꼬이지 않음
              setTimeout(() => historyTriggerRef.current?.click(), 0)
            }}
          >
            <Ticket className="mr-2 h-4 w-4" />
            신청 내역
          </DropdownMenuItem>
        }
      />
    </>
  )
}
