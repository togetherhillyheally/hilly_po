"use client"

import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ProfileMenu } from "@/components/layout/ProfileMenu"
import { Button } from "@/components/ui/button"
import { useCurrentUser } from "@/hooks/use-current-user"

/**
 * 사이트 공통 헤더 — 홈·이벤트·관제·내 지도·결제 결과가 모두 이 컴포넌트 하나를 쓴다.
 *  [로고 HILLY HEALLY GROUND]        {actions} | 이벤트 · 관제 · (로그인 | 프로필 칩)
 *  공통 메뉴는 오른쪽 끝에 고정 — 페이지 전용 버튼은 그 왼쪽에 붙여 메뉴 위치가 페이지마다 바뀌지 않게
 *
 * 모든 화면 같은 구조: 바깥은 전체 폭·상단 고정·하단 경계선, 안쪽은 본문과 같은 max-w-6xl 가운데 정렬.
 * 페이지 본문 컨테이너 "밖"에 둔다.
 * - actions: 페이지 전용 버튼 (예: 이벤트의 "신청하기")
 * - menuItems: 프로필 메뉴에 덧붙일 항목 (예: 이벤트의 "신청 내역")
 * - loginNext: 로그인 후 돌아올 경로 (기본: 지금 경로)
 */
export function SiteHeader({
  actions,
  menuItems,
  loginNext,
}: {
  actions?: ReactNode
  menuItems?: ReactNode
  loginNext?: string
}) {
  const pathname = usePathname()
  const { user, loading } = useCurrentUser()
  const navClass = (href: string) =>
    pathname === href || pathname.startsWith(href + "/")
      ? // 지금 보고 있는 메뉴 — 배경으로 구분
        "bg-foreground/10 font-semibold text-foreground hover:bg-foreground/15"
      : "text-muted-foreground"
  const next = loginNext ?? pathname

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-sm font-bold tracking-tight"
        >
          <Image
            src="/images/logo.png"
            alt="Hilly Heally 로고"
            width={28}
            height={28}
            priority
          />
          <span>
            HILLY HEALLY{" "}
            <span className="hidden text-muted-foreground sm:inline">GROUND</span>
          </span>
        </Link>

        <div className="flex min-w-0 items-center gap-2">
          {actions && <div className="flex items-center gap-1.5">{actions}</div>}
          <nav className="flex items-center gap-1">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className={"relative " + navClass("/events")}
            >
              <Link href="/events">
                이벤트
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#DC2F55]" />
              </Link>
            </Button>
            {/* 관제 — 로그인 없이 공개 보기 */}
            <Button asChild variant="ghost" size="sm" className={navClass("/control")}>
              <Link href="/control">관제</Link>
            </Button>
            {/* 로그인 상태 확인 전엔 아바타 크기 자리만 잡아 둔다 (메뉴가 밀리거나 로그인 버튼이 깜빡이지 않게) */}
            {loading ? (
              <span className="h-9 w-9" aria-hidden />
            ) : (
              user ? (
                <ProfileMenu menuItems={menuItems} />
              ) : (
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="hover:bg-[#DC2F55] hover:text-white"
                >
                  <Link href={`/login?next=${encodeURIComponent(next)}`}>로그인</Link>
                </Button>
              )
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}
