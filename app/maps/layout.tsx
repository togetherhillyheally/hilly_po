import Link from "next/link"
import { LogoutButton } from "@/components/auth/LogoutButton"

export default function MapsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/maps" className="text-base font-bold">
            힐리힐리 <span className="text-muted-foreground">지도만들기</span>
          </Link>
          <LogoutButton />
        </div>
      </header>
      {children}
    </div>
  )
}
