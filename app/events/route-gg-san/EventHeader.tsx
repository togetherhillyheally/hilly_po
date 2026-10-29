"use client"

import { useRef } from "react"
import { Ticket } from "lucide-react"
import { SiteHeader } from "@/components/layout/SiteHeader"
import { Button } from "@/components/ui/button"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { SignupSheet } from "./SignupSheet"

/** 이벤트 페이지 헤더 — 공통 SiteHeader + "신청하기" 버튼, 프로필 메뉴에 "신청 내역" */
export function EventHeader() {
  const historyTriggerRef = useRef<HTMLButtonElement>(null)
  return (
    <>
      {/* 신청 내역 메뉴에서 여는 숨은 트리거 — 드롭다운 밖에 있어야 메뉴가 닫혀도 시트가 유지된다 */}
      <SignupSheet intent="history">
        <button ref={historyTriggerRef} className="hidden" aria-hidden />
      </SignupSheet>
      <SiteHeader
        actions={
          <SignupSheet>
            <Button
              size="sm"
              className="bg-[#DC2F55] text-white hover:bg-[#DC2F55]/90"
            >
              신청하기
            </Button>
          </SignupSheet>
        }
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
