"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Button } from "@/components/ui/button";

/** /maps 공통 헤더 — 에디터 화면은 전체 폭이라 타이틀도 왼쪽 끝에 붙인다 */
export function MapsHeader() {
  const pathname = usePathname();
  const isEditor = /^\/maps\/[^/]+\/edit/.test(pathname);
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div
        className={`flex h-14 items-center justify-between px-4 ${
          isEditor ? "" : "mx-auto max-w-6xl"
        }`}
      >
        <Link href="/maps" className="text-base font-bold">
          힐리힐리 <span className="text-muted-foreground">지도만들기</span>
        </Link>
        <div className="flex items-center gap-1">
          {isEditor && (
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
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
