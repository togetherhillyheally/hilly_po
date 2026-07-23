import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  BadgeCheck,
  FileUp,
  MapPin,
  MousePointerClick,
  Route,
  Stamp,
} from "lucide-react"

const FEATURES = [
  {
    icon: MousePointerClick,
    title: "클릭으로 체크포인트",
    description:
      "웹 지도를 클릭하면 그 자리에 체크포인트가 생겨요. 설명·사진·퀴즈까지 한 화면에서 정리해요.",
  },
  {
    icon: FileUp,
    title: "GPX 업로드",
    description:
      "산행·러닝 기록 GPX 파일을 올리면 거리와 누적 상승이 계산된 코스지도가 만들어져요.",
  },
  {
    icon: MapPin,
    title: "도착 반경 설정",
    description:
      "포인트마다 GPS 도착 인정 반경(5–500m)을 정할 수 있어요. 지도 위에서 바로 확인돼요.",
  },
  {
    icon: BadgeCheck,
    title: "앱에서 바로 플레이",
    description:
      "저장하면 힐리힐리 앱에 즉시 반영돼요. 같은 번호로 로그인하면 내 계정 지도가 돼요.",
  },
] as const

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-6xl px-6">
      {/* 헤더 */}
      <header className="flex h-16 items-center justify-between">
        <span className="text-sm font-bold tracking-tight">
          HILLY HEALLY <span className="text-muted-foreground">STUDIO</span>
        </span>
        <Button asChild variant="ghost" size="sm">
          <Link href="/login">로그인</Link>
        </Button>
      </header>

      {/* 히어로 */}
      <section className="flex min-h-[70dvh] flex-col justify-center py-16">
        <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Route className="h-4 w-4" /> 코스지도
          <span className="text-border">·</span>
          <Stamp className="h-4 w-4" /> 스탬프지도
        </p>
        <h1 className="mt-5 max-w-3xl text-5xl font-bold leading-[1.08] tracking-tighter sm:text-7xl">
          나만의 지도를
          <br />
          <span className="text-[#DC2F55]">웹에서</span> 직접 만든다
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
          GPX 코스를 올리고, 지도를 클릭해 체크포인트를 놓고, 퀴즈와 도착
          반경까지. 완성한 지도는 힐리힐리 앱에서 바로 플레이할 수 있어요.
        </p>
        <div className="mt-10 flex items-center gap-4">
          <Button
            asChild
            size="lg"
            className="h-13 bg-[#DC2F55] px-8 text-base text-white hover:bg-[#DC2F55]/90"
          >
            <Link href="/maps">지도 만들기 시작</Link>
          </Button>
          <span className="text-sm text-muted-foreground">
            휴대폰 번호만 있으면 돼요
          </span>
        </div>
      </section>

      {/* 기능 */}
      <section className="grid gap-4 pb-24 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="rounded-2xl border bg-card p-6 transition-colors hover:border-foreground/20"
          >
            <f.icon className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
            <p className="mt-4 font-semibold">{f.title}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {f.description}
            </p>
          </div>
        ))}
      </section>

      <footer className="border-t py-8 text-center text-xs text-muted-foreground">
        © HillyHeally · hillyheally.com
      </footer>
    </main>
  )
}
