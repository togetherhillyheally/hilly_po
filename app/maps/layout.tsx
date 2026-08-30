import type { Metadata } from "next";
import { MapsHeader } from "@/components/layout/MapsHeader";

// 로그인 전용 영역 — 검색 색인 제외
export const metadata: Metadata = {
  title: "내 지도 · 힐리힐리 MAP",
  robots: { index: false, follow: false },
};

export default function MapsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen">
      <MapsHeader />
      {children}
    </div>
  );
}
