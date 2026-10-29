"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ProfileMenu } from "@/components/layout/ProfileMenu"
import { Button } from "@/components/ui/button"
import { useCurrentUser } from "@/hooks/use-current-user"
import { NATSEONGOT } from "@/lib/events"

/** 공개 화면 공통 헤더 — 홈(/)과 관제(/control)가 같은 메뉴를 쓴다.
 *  이벤트 · 관제 · (로그인 | 내 지도 + 프로필) */
export function SiteHeader({ className }: { className?: string }) {
  const pathname = usePathname()
  const { user, loading } = useCurrentUser()
  const active = (href: string) =>
    pathname === href || pathname.startsWith(href + "/")
      ? "text-foreground"
      : "text-muted-foreground"

  return (
    <header
      className={"flex h-16 items-center justify-between " + (className ?? "")}
    >
      <Link href="/" className="text-sm font-bold tracking-tight">
        HILLY HEALLY <span className="text-muted-foreground">GROUND</span>
      </Link>
      <div className="flex items-center gap-1">
        <Button asChild variant="ghost" size="sm" className={"relative " + active(NATSEONGOT.path)}>
          <Link href={NATSEONGOT.path}>
            이벤트
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#DC2F55]" />
          </Link>
        </Button>
        {/* 관제 — 로그인 없이 공개 보기 */}
        <Button asChild variant="ghost" size="sm" className={active("/control")}>
          <Link href="/control">관제</Link>
        </Button>
        {/* 로그인 상태 확인 전엔 비워 둔다 (로그인 버튼 깜빡임 방지) */}
        {!loading &&
          (user ? (
            <>
              <Button asChild variant="ghost" size="sm" className={active("/maps")}>
                <Link href="/maps">내 지도</Link>
              </Button>
              <ProfileMenu />
            </>
          ) : (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hover:bg-[#DC2F55] hover:text-white"
            >
              <Link href="/login">로그인</Link>
            </Button>
          ))}
      </div>
    </header>
  )
}
