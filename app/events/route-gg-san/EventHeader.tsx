"use client"

import { useEffect, useRef, useState } from "react"
import { Ticket } from "lucide-react"
import { SiteHeader } from "@/components/layout/SiteHeader"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { SignupSheet } from "./SignupSheet"

/** 이벤트 페이지 헤더 — 공통 SiteHeader 그대로, 프로필 메뉴에만 "신청 내역" 추가 (신청하기는 본문에) */
export function EventHeader() {
  const historyTriggerRef = useRef<HTMLButtonElement>(null)
  // ?mine=1 (또는 /events/route-gg-san/mine) 로 들어오면 신청 내역을 바로 연다.
  // 주소에서는 지워서 새로고침·뒤로가기 때 다시 열리지 않게 한다.
  const [openMine, setOpenMine] = useState(false)
  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.get("mine") !== "1") return
    setOpenMine(true)
    url.searchParams.delete("mine")
    window.history.replaceState(null, "", url.pathname + url.search + url.hash)
  }, [])
  return (
    <>
      {/* 신청 내역 메뉴에서 여는 숨은 트리거 — 드롭다운 밖에 있어야 메뉴가 닫혀도 시트가 유지된다 */}
      <SignupSheet intent="history" autoOpen={openMine}>
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
