"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Radio } from "lucide-react";
import { ProfileMenu } from "@/components/layout/ProfileMenu";
import { Button } from "@/components/ui/button";
import { useSuperAdmin } from "@/hooks/use-super-admin";

/** /maps·/control 공통 헤더.
 *  관제(/control)에서는 "힐리힐리 LIVE" 타이틀 + 좌측 정렬(전체 폭),
 *  에디터 화면도 전체 폭이라 타이틀을 왼쪽 끝에 붙인다. */
export function MapsHeader() {
  const pathname = usePathname();
  const isEditor = /^\/maps\/[^/]+\/edit/.test(pathname);
  const isControl = pathname.startsWith("/control");
  const { isAdmin } = useSuperAdmin();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      {/* 지도만들기/LIVE 모두 동일하게 좌측 정렬(전체 폭) — 화면 전환 시 타이틀 위치 고정 */}
      <div className="flex h-14 items-center justify-between px-4">
        {isControl ? (
          <Link href="/control" className="text-base font-bold">
            힐리힐리 <span className="text-[#DC2F55]">LIVE</span>
          </Link>
        ) : (
          <Link href="/maps" className="text-base font-bold">
            힐리힐리 <span className="text-[#DC2F55]">MAP</span>
          </Link>
        )}
        <div className="flex items-center gap-1">
          {isAdmin && !isControl && (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
            >
              <Link href="/control">
                <Radio className="mr-1.5 h-4 w-4" />
                관제
              </Link>
            </Button>
          )}
          {(isEditor || isControl) && (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
            >
              <Link href="/maps">
                <LayoutGrid className="mr-1.5 h-4 w-4" />내 지도
              </Link>
            </Button>
          )}
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
