import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import {
  Backpack,
  CalendarDays,
  Clock,
  Compass,
  Gift,
  MapPin,
  Navigation,
  Package,
  Radio,
  ShieldCheck,
  Ticket,
  Trophy,
  Users,
  Wallet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Reveal } from "@/components/landing/Reveal"
import { NATSEONGOT as EV } from "@/lib/events"
import { SignupSheet } from "./SignupSheet"

export const metadata: Metadata = {
  title: "낯선곳으로 — 은티마을 스탬프 게임 | 힐리힐리",
  description:
    "2026.11.14 괴산 은티마을. 배점이 다른 스탬프를 자유 순서로 모으는 숲길 팀 전략 게임. 순위는 없고, 팀이 정한 목표만 있어요. 16명 한정.",
  openGraph: {
    title: "낯선곳으로 — 은티마을 스탬프 게임",
    description:
      "숲길에서 펼쳐지는 팀 전략 게임. 2026.11.14 괴산 은티마을, 16명 한정 모집.",
    images: ["/events/course.jpg"],
  },
}

const FACTS = [
  {
    icon: CalendarDays,
    label: "일시",
    value: EV.dateLabel,
    sub: EV.timeLabel,
  },
  { icon: MapPin, label: "장소", value: EV.placeLabel, sub: EV.placeSub },
  {
    icon: Users,
    label: "모집",
    value: `${EV.capacity}명 한정`,
    sub: "4인 1팀 × 4팀 (2인 1조 이동)",
  },
  {
    icon: Wallet,
    label: "참가비",
    value: `${EV.fee.toLocaleString()}원`,
    sub: "왕복 이동 · 보급 · 기념품 포함",
  },
] as const

const STAMPS = [
  { name: "시루봉쉼터", pt: 20, zone: "산길" },
  { name: "중앙 갈림길", pt: 20, zone: "산길" },
  { name: "서쪽 갈림길", pt: 30, zone: "산길" },
  { name: "구왕봉", pt: 40, zone: "산길" },
  { name: "희양산", pt: 50, zone: "산길" },
  { name: "이만봉", pt: 50, zone: "둘레길" },
  { name: "둘레길 분지리", pt: 40, zone: "둘레길" },
  { name: "둘레길 쌍천", pt: 30, zone: "둘레길" },
] as const

const RULES = [
  {
    icon: Users,
    title: "4명 한 팀, 2명씩 한 조",
    desc: "팀 안에서 2인 1조로 나뉘어 움직여요. 팀 점수는 두 조가 찍은 스탬프를 합쳐 계산하니, 갈라져서 다른 곳을 찍는 쪽이 이득이에요.",
  },
  {
    icon: Compass,
    title: "작전 타임 15분, 그리고 목표 선언",
    desc: "출발 전 지도와 배점을 보고 동선을 짜요. 그리고 팀의 목표를 선언해요 — “우리는 오늘 160점.” 남을 이기는 게 아니라 우리 팀을 정확히 읽는 게 승부예요.",
  },
  {
    icon: Navigation,
    title: "순서도, 경로도 자유",
    desc: "스탬프 8곳을 어떤 순서로 어떻게 돌아도 괜찮아요. 다만 전부 돌기엔 시간이 빠듯해요. 어디를 가고 어디를 버릴지가 이 게임의 전부예요.",
  },
  {
    icon: Trophy,
    title: "둘레길에 가장 큰 점수",
    desc: "이만봉 50점, 속리산둘레길 분지리 40점, 쌍천 30점. 한국등산트레킹지원센터와 함께 여는 코스라 둘레길 축에 최고 배점을 뒀어요.",
  },
  {
    icon: Gift,
    title: "100점이면 기념품함이 열려요",
    desc: "베이스캠프의 기념품함은 100점을 모은 팀이 피니시에서 모두가 보는 앞에서 열어요. 둘레길만 돌아도 닿는 기준이라 모든 팀이 열 수 있어요.",
  },
  {
    icon: Ticket,
    title: "넘긴 점수는 추첨권으로",
    desc: "100점을 넘긴 만큼 10점당 추첨권 1장. 티타임에 경품 추첨을 열어요. 많이 돌수록 장수는 늘지만 당첨은 운이에요.",
  },
  {
    icon: Clock,
    title: "같은 시각에 모여요",
    desc: "감점도 실격도 없어요. 다만 모두가 같은 귀환 시각에 은티마을로 돌아와 티타임을 함께해요. 늦어지면 관제가 확인하고 차량이 모시러 가요.",
  },
] as const

const PROVIDED = [
  { icon: Navigation, text: "서울 ↔ 은티마을 왕복 전용 차량" },
  { icon: Package, text: "파밍박스·파밍백 보급 (물·음료·에너지젤)" },
  { icon: Radio, text: "실시간 GPS 관제 — 가족·지인 응원 시청" },
  { icon: Gift, text: "기념품 + 티타임 경품 추첨" },
  { icon: Compass, text: "사진·영상 기록 제공" },
] as const

const SAFETY = [
  "2인 1조 이동이 원칙이에요. 혼자 다니지 않아요.",
  "운영본부가 전원의 위치를 실시간으로 봐요. 경로 이탈·장시간 정지 시 바로 연락해요.",
  "일몰 약 1시간 전 전원 복귀가 원칙이고, 늦어지면 운영 차량이 모시러 가요.",
  "언제든 기권할 수 있어요. 기권하면 차량이 데리러 가요.",
  "참가자 전원 행사 상해보험에 가입해요.",
] as const

const GEAR = [
  "개인 식수",
  "트레일화",
  "방풍 의류",
  "휴대폰 + 힐리힐리 앱",
  "개인 행동식",
] as const

export default function NatseongotPage() {
  const mountain = STAMPS.filter((s) => s.zone === "산길")
  const dullegil = STAMPS.filter((s) => s.zone === "둘레길")
  const sum = (arr: readonly { pt: number }[]) =>
    arr.reduce((a, b) => a + b.pt, 0)

  return (
    <main className="mx-auto max-w-6xl px-6">
      {/* 헤더 */}
      <header className="flex h-16 items-center justify-between">
        <Link href="/" className="text-sm font-bold tracking-tight">
          HILLY HEALLY <span className="text-muted-foreground">GROUND</span>
        </Link>
        <SignupSheet>
          <Button
            size="sm"
            className="bg-[#DC2F55] text-white hover:bg-[#DC2F55]/90"
          >
            신청하기
          </Button>
        </SignupSheet>
      </header>

      {/* 히어로 */}
      <section className="py-14 sm:py-20">
        <Reveal>
          <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#DC2F55]" />
            HillyHeally × 한국등산트레킹지원센터
          </p>
          <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tighter sm:text-5xl xl:text-6xl">
            <span className="text-[#DC2F55]">낯선곳</span>으로
            <br />
            은티마을 스탬프 게임
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            숲길에서 펼쳐지는 팀 전략 게임. 배점이 다른 스탬프 8곳을 자유
            순서로 모으고, 해가 지기 전 은티마을로 돌아와요.
          </p>
          <p className="mt-3 text-sm font-medium text-[#DC2F55]">
            순위는 없어요. 팀이 정한 목표만 있어요.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <SignupSheet>
              <Button
                size="lg"
                className="h-12 bg-[#DC2F55] px-8 text-base text-white hover:bg-[#DC2F55]/90"
              >
                신청하기
              </Button>
            </SignupSheet>
            <Button asChild size="lg" variant="outline" className="h-12 px-8 text-base">
              <a href="#game">게임 보기</a>
            </Button>
          </div>
        </Reveal>
      </section>

      {/* 개요 */}
      <section className="pb-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FACTS.map((f, i) => (
            <Reveal key={f.label} delay={i * 0.06}>
              <div className="h-full rounded-2xl border bg-card p-6 transition-colors hover:border-foreground/20">
                <f.icon className="h-5 w-5 text-[#DC2F55]" strokeWidth={1.5} />
                <p className="mt-4 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  {f.label}
                </p>
                <p className="mt-1.5 font-semibold leading-snug">{f.value}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {f.sub}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 철학 */}
      <section className="border-t py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-muted-foreground">WHY</p>
          <h2 className="mt-4 text-2xl font-bold leading-snug tracking-tighter sm:text-4xl">
            산을 잘 탄다는 것 —
            <br />
            <span className="text-[#DC2F55]">
              나를 알고, 길을 알고, 안전하게.
            </span>
          </h2>
          <p className="mt-7 text-base leading-relaxed text-muted-foreground">
            기록에 도전하는 날도, 숲에서 쉬어 가는 날도, 낯선 길을 찾아 나서는
            날도 있어요. 이번 낯선곳으로는{" "}
            <b className="font-semibold text-foreground">세 번째 날</b>을 위한
            하루예요.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            그래서 순위표를 두지 않았어요. 대신 출발 전 팀이 스스로 목표를
            선언하고, 돌아와 그 선언과 비교해요. 무리한 목표로 못 지킨 팀보다
            수수한 목표를 정확히 달성한 팀이 더 노련한 팀이니까요.
          </p>
        </Reveal>
      </section>

      {/* 게임 */}
      <section id="game" className="scroll-mt-8 border-t py-20">
        <Reveal>
          <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl">
            점수를 모으는 팀 전략 게임
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            로게이닝(점수 오리엔티어링)에서 전략만 가져왔어요. 경쟁은 덜고,
            선택의 재미만 남겼어요.
          </p>
        </Reveal>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {RULES.map((r, i) => (
            <Reveal key={r.title} delay={(i % 3) * 0.06}>
              <div className="h-full rounded-2xl border bg-card p-7 transition-colors hover:border-foreground/20">
                <r.icon className="h-6 w-6 text-[#DC2F55]" strokeWidth={1.5} />
                <p className="mt-4 text-lg font-semibold leading-snug">
                  {r.title}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {r.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 코스 */}
      <section id="course" className="scroll-mt-8 border-t py-20">
        <Reveal>
          <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl">
            스탬프 8곳 · 총 {sum(STAMPS)}점
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            멀고 높을수록 점수가 커요. 베이스캠프는 은티마을이에요.
          </p>
        </Reveal>

        <div className="mt-8 grid gap-4 lg:grid-cols-5">
          <Reveal className="lg:col-span-3">
            <div className="overflow-hidden rounded-2xl border bg-card">
              <Image
                src="/events/course.jpg"
                alt="은티마을 스탬프 게임 코스 지도"
                width={1600}
                height={1149}
                className="h-auto w-full"
                priority
              />
              <p className="border-t px-6 py-4 text-xs leading-relaxed text-muted-foreground">
                배치는 예시예요. 실제 스탬프 위치는 합동 답사에서 확정해
                참가자에게 안내해요.
              </p>
            </div>
          </Reveal>

          <div className="space-y-4 lg:col-span-2">
            <Reveal delay={0.08}>
              <div className="rounded-2xl border bg-card">
                <div className="flex items-center justify-between border-b px-6 py-4">
                  <span className="font-semibold">산길 축</span>
                  <span className="text-sm font-semibold text-muted-foreground tabular-nums">
                    {sum(mountain)}점
                  </span>
                </div>
                <ul>
                  {mountain.map((s) => (
                    <li
                      key={s.name}
                      className="flex items-center justify-between border-b px-6 py-2.5 text-sm last:border-0"
                    >
                      <span className="text-muted-foreground">{s.name}</span>
                      <span className="font-semibold tabular-nums">
                        {s.pt}점
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            <Reveal delay={0.14}>
              <div className="rounded-2xl border border-[#DC2F55]/30 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(220,47,85,0.10),transparent_55%)]">
                <div className="flex items-center justify-between border-b px-6 py-4">
                  <span className="font-semibold">
                    둘레길 축{" "}
                    <span className="ml-1 text-xs font-bold text-[#DC2F55]">
                      최고 배점
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-[#DC2F55] tabular-nums">
                    {sum(dullegil)}점
                  </span>
                </div>
                <ul>
                  {dullegil.map((s) => (
                    <li
                      key={s.name}
                      className="flex items-center justify-between border-b px-6 py-2.5 text-sm last:border-0"
                    >
                      <span>{s.name}</span>
                      <span className="font-semibold text-[#DC2F55] tabular-nums">
                        {s.pt}점
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            <Reveal delay={0.2}>
              <div className="flex gap-3 rounded-2xl border bg-card p-6">
                <Gift
                  className="h-5 w-5 shrink-0 text-[#DC2F55]"
                  strokeWidth={1.5}
                />
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <b className="font-semibold text-foreground">100점</b>이면
                  기념품함이 열리고, 넘긴 점수는{" "}
                  <b className="font-semibold text-foreground">
                    10점당 추첨권 1장
                  </b>
                  으로 바꿔 티타임 경품 추첨에 써요.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 제공 · 안전 */}
      <section className="border-t py-20">
        <div className="grid gap-4 md:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-2xl border bg-card p-7">
              <h3 className="text-xl font-semibold tracking-tight">
                참가비에 포함된 것
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                1인 {EV.fee.toLocaleString()}원
              </p>
              <ul className="mt-6 space-y-4">
                {PROVIDED.map((p) => (
                  <li key={p.text} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#DC2F55]/10">
                      <p.icon
                        className="h-4 w-4 text-[#DC2F55]"
                        strokeWidth={1.5}
                      />
                    </span>
                    <span className="pt-1.5 text-sm leading-relaxed">
                      {p.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="h-full rounded-2xl border bg-card p-7">
              <div className="flex items-center gap-2">
                <ShieldCheck
                  className="h-5 w-5 text-[#DC2F55]"
                  strokeWidth={1.5}
                />
                <h3 className="text-xl font-semibold tracking-tight">
                  안전하게
                </h3>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                11월 산중, 해가 짧아요
              </p>
              <ul className="mt-6 space-y-3">
                {SAFETY.map((s) => (
                  <li
                    key={s}
                    className="relative pl-4 text-sm leading-relaxed text-muted-foreground"
                  >
                    <span className="absolute left-0 top-[0.55rem] h-1.5 w-1.5 rounded-full bg-[#DC2F55]/70" />
                    {s}
                  </li>
                ))}
              </ul>
              <div className="mt-6 border-t pt-5">
                <div className="flex items-center gap-2">
                  <Backpack
                    className="h-4 w-4 text-muted-foreground"
                    strokeWidth={1.5}
                  />
                  <span className="text-sm font-semibold">준비물</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {GEAR.map((g) => (
                    <span
                      key={g}
                      className="rounded-lg border px-3 py-1.5 text-xs text-muted-foreground"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 신청 */}
      <section id="signup" className="scroll-mt-8 border-t py-20">
        <Reveal>
          <div className="mx-auto max-w-2xl rounded-2xl border bg-[radial-gradient(120%_120%_at_0%_0%,rgba(220,47,85,0.10),transparent_55%)] p-8 text-center sm:p-12">
            <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl">
              {EV.capacity}명 한정, 함께 가실래요?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
              신청서를 보내고 참가비를 결제하면 신청이 확정돼요. 팀 배정과 집결
              안내는 행사 일주일 전 개별로 보내드려요.
            </p>

            <dl className="mx-auto mt-8 grid max-w-sm grid-cols-2 gap-3 text-left">
              <div className="rounded-xl border bg-background px-4 py-3">
                <dt className="text-xs text-muted-foreground">참가비</dt>
                <dd className="mt-0.5 font-semibold tabular-nums">
                  {EV.fee.toLocaleString()}원
                </dd>
              </div>
              <div className="rounded-xl border bg-background px-4 py-3">
                <dt className="text-xs text-muted-foreground">정원</dt>
                <dd className="mt-0.5 font-semibold tabular-nums">
                  {EV.capacity}명
                </dd>
              </div>
            </dl>

            <SignupSheet>
              <Button
                size="lg"
                className="mt-8 h-12 w-full max-w-sm bg-[#DC2F55] text-base text-white hover:bg-[#DC2F55]/90"
              >
                신청서 작성하기
              </Button>
            </SignupSheet>

            <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
              결제 후 행사 7일 전까지 전액 환불돼요.
            </p>
          </div>
        </Reveal>
      </section>

      {/* 푸터 */}
      <footer className="flex flex-col items-center justify-between gap-4 border-t py-10 text-xs text-muted-foreground sm:flex-row">
        <span>주최 힐리힐리 · 협력 한국등산트레킹지원센터</span>
        <Link href="/" className="hover:text-foreground">
          힐리힐리 그라운드 홈
        </Link>
      </footer>
    </main>
  )
}
