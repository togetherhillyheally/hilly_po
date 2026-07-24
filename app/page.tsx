import Link from "next/link"
import { Button } from "@/components/ui/button"
import { HeroMapLazy } from "@/components/landing/HeroMapLazy"
import { Reveal } from "@/components/landing/Reveal"
import {
  BadgeCheck,
  FileUp,
  MapPin,
  MousePointerClick,
  Route,
  Stamp,
} from "lucide-react"

const STEPS = [
  {
    title: "코스를 올리거나 그린다",
    description: "GPX 파일을 올리면 거리와 누적 상승이 자동 계산돼요. 경로 없이 스탬프지도로 시작할 수도 있어요.",
  },
  {
    title: "포인트를 채운다",
    description: "지도를 클릭해 체크포인트를 놓고 설명, 사진, 객관식 퀴즈, GPS 도착 반경까지 정해요.",
  },
  {
    title: "앱에서 플레이한다",
    description: "완료 버튼을 누르면 힐리힐리 앱에 공개돼요. 완료 전까지는 나에게만 보여요.",
  },
] as const

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-6xl px-6">
      {/* 헤더 */}
      <header className="flex h-16 items-center justify-between">
        <span className="text-sm font-bold tracking-tight">
          HILLY HEALLY <span className="text-muted-foreground">GROUND</span>
        </span>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="hover:bg-[#DC2F55] hover:text-white"
        >
          <Link href="/login">로그인</Link>
        </Button>
      </header>

      {/* 히어로 — 좌: 카피 / 우: 실제 Mapbox 데모 지도 */}
      <section className="grid items-center gap-10 py-12 lg:min-h-[78dvh] lg:grid-cols-12 lg:gap-8 lg:py-8">
        <Reveal className="lg:col-span-5">
          <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Route className="h-4 w-4" /> 코스지도
            <span className="text-border">·</span>
            <Stamp className="h-4 w-4" /> 스탬프지도
          </p>
          <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tighter sm:text-5xl xl:text-6xl">
            나만의 지도를
            <br />
            <span className="text-[#DC2F55]">웹에서</span> 직접 만든다
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
            GPX 코스를 올리고 지도를 클릭해 체크포인트를 놓으면, 힐리힐리
            앱에서 바로 플레이할 수 있어요.
          </p>
          <div className="mt-9">
            <Button
              asChild
              size="lg"
              className="h-12 bg-[#DC2F55] px-8 text-base text-white hover:bg-[#DC2F55]/90"
            >
              <Link href="/maps">지도 만들기 시작</Link>
            </Button>
          </div>
        </Reveal>
        <Reveal delay={0.15} className="lg:col-span-7">
          <HeroMapLazy className="h-[320px] sm:h-[420px] lg:h-[540px]" />
        </Reveal>
      </section>

      {/* 기능 — 벤토 (2:1 / 1:2 리듬) */}
      <section className="py-20">
        <Reveal>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            지도 하나에 필요한 전부
          </h2>
        </Reveal>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <Reveal className="lg:col-span-2">
            <div className="h-full rounded-2xl border bg-[radial-gradient(120%_120%_at_0%_0%,rgba(220,47,85,0.10),transparent_55%)] p-7 transition-colors hover:border-foreground/20">
              <MousePointerClick className="h-6 w-6 text-[#DC2F55]" strokeWidth={1.5} />
              <p className="mt-4 text-lg font-semibold">클릭으로 체크포인트</p>
              <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-muted-foreground">
                웹 지도를 클릭하면 그 자리에 체크포인트가 생겨요. 설명과 사진,
                객관식 퀴즈까지 한 화면에서 정리하고 순서도 자유롭게 바꿔요.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="h-full rounded-2xl border bg-card p-7 transition-colors hover:border-foreground/20">
              <FileUp className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
              <p className="mt-4 text-lg font-semibold">GPX 업로드</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                산행·러닝 기록을 올리면 거리와 누적 상승이 계산된 코스지도가
                만들어져요.
              </p>
            </div>
          </Reveal>
          <Reveal>
            <div className="h-full rounded-2xl border bg-card p-7 transition-colors hover:border-foreground/20">
              <MapPin className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
              <p className="mt-4 text-lg font-semibold">도착 반경 설정</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                포인트마다 GPS 도착 인정 반경(5-500m)을 정하고 지도 위에서 바로
                확인해요.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.08} className="lg:col-span-2">
            <div className="h-full rounded-2xl border bg-white/[0.03] p-7 transition-colors hover:border-foreground/20">
              <BadgeCheck className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
              <p className="mt-4 text-lg font-semibold">앱에서 바로 플레이</p>
              <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-muted-foreground">
                완료하면 힐리힐리 앱에 바로 공개돼요. 친구를 초대해 함께 걷고,
                스탬프를 모으고, 퀴즈를 풀 수 있어요.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 순서 — 하어라인 리스트 (벤토와 다른 레이아웃 패밀리) */}
      <section className="py-20">
        <Reveal>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            만드는 순서
          </h2>
        </Reveal>
        <div className="mt-8 grid gap-10 border-t pt-10 sm:grid-cols-3 sm:gap-8">
          {STEPS.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.08}>
              <p className="font-mono text-sm text-[#DC2F55]">{i + 1}</p>
              <p className="mt-3 font-semibold">{step.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </Reveal>
          ))}
        </div>
      </section>

      <footer className="mt-4 border-t py-8 text-center text-xs text-muted-foreground">
        © HillyHeally · hillyheally.com
      </footer>
    </main>
  )
}
