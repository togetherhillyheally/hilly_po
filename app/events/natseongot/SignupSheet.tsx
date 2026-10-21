"use client"

import { useState, type ReactNode } from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useIsMobile } from "@/components/ui/use-mobile"
import { NATSEONGOT as EV } from "@/lib/events"
import { SignupForm } from "./SignupForm"

/** 신청 폼 패널 — 데스크톱은 오른쪽, 모바일은 아래에서 올라와요. */
export function SignupSheet({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const isMobile = useIsMobile()

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={
          isMobile
            ? "flex h-[92dvh] w-full flex-col gap-0 rounded-t-2xl p-0"
            : "flex w-full flex-col gap-0 p-0 sm:max-w-2xl"
        }
      >
        <SheetHeader className="space-y-1 border-b px-6 py-5 text-left">
          <SheetTitle className="text-lg tracking-tight">
            낯선곳으로 참가 신청
          </SheetTitle>
          <SheetDescription className="text-xs">
            {EV.dateLabel} · {EV.placeLabel} · {EV.capacity}명 한정
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <SignupForm />
        </div>
      </SheetContent>
    </Sheet>
  )
}
