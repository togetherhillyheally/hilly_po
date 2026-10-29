"use client"

import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ProfileMenu } from "@/components/layout/ProfileMenu"
import { Button } from "@/components/ui/button"
import { useCurrentUser } from "@/hooks/use-current-user"
import { NATSEONGOT } from "@/lib/events"

/**
 * 사이트 공통 헤더 — 홈·이벤트·관제·내 지도·결제 결과가 모두 이 컴포넌트 하나를 쓴다.
 *  [로고 HILLY HEALLY GROUND]        이벤트 · 관제 · {actions} · (로그인 | 프로필 칩)
 *
 * - layout "page": 페이지 본문 컨테이너(max-w) 안에 놓는 헤더 (홈·이벤트)
 * - layout "app":  전체 폭 상단 고정 + 하단 경계선 (관제·지도처럼 화면을 꽉 채우는 영역)
 * - actions: 페이지 전용 버튼 (예: 이벤트의 "신청하기")
 * - menuItems: 프로필 메뉴에 덧붙일 항목 (예: 이벤트의 "신청 내역")
 * - loginNext: 로그인 후 돌아올 경로 (기본: 지금 경로)
 */
export function SiteHeader({
  layout = "page",
  actions,
  menuItems,
  loginNext,
}: {
  layout?: "page" | "app"
  actions?: ReactNode
  menuItems?: ReactNode
  loginNext?: string
}) {
  const pathname = usePathname()
  const { user, loading } = useCurrentUser()
  const navClass = (href: string) =>
    pathname === href || pathname.startsWith(href + "/")
      ? "text-foreground"
      : "text-muted-foreground"
  const next = loginNext ?? pathname

  const bar = (
    <div
      className={
        "flex items-center justify-between gap-2 " +
        (layout === "app" ? "h-14 px-4" : "h-16")
      }
    >
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

      <nav className="flex min-w-0 items-center gap-1">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className={"relative " + navClass(NATSEONGOT.path)}
        >
          <Link href={NATSEONGOT.path}>
            이벤트
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#DC2F55]" />
          </Link>
        </Button>
        {/* 관제 — 로그인 없이 공개 보기 */}
        <Button asChild variant="ghost" size="sm" className={navClass("/control")}>
          <Link href="/control">관제</Link>
        </Button>
        {actions}
        {/* 로그인 상태 확인 전엔 비워 둔다 (로그인 버튼 깜빡임 방지) */}
        {!loading &&
          (user ? (
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
          ))}
      </nav>
    </div>
  )

  if (layout === "app") {
    return (
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        {bar}
      </header>
    )
  }
  return <header>{bar}</header>
}
