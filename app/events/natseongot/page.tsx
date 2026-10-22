import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import {
  Backpack,
  CalendarDays,
  Clock,
  Compass,
  Flag,
  Footprints,
  Gift,
  Lock,
  MapPin,
  Navigation,
  Package,
  Radio,
  ShieldCheck,
  Ticket,
  Users,
  Wallet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Reveal } from "@/components/landing/Reveal"
import { CourseMapLazy } from "@/components/events/CourseMapLazy"
import { NATSEONGOT as EV } from "@/lib/events"
import { COURSE, CPS, TIERS, TIER_COLOR, totalPoints } from "@/lib/events/gwanggyo-cps"
import { SignupSheet } from "./SignupSheet"
import { UserChip } from "./UserChip"

export const metadata: Metadata = {
  title: "ROUTE @광교 | 힐리힐리",
  description:
    "2026.11.14 수원 광교산. 배점이 다른 체크포인트 26곳을 4시간 안에 자유 순서로 모으는 숲길 팀 전략 게임. 순위는 없고, 팀이 정한 목표만 있어요. 32명 한정.",
  openGraph: {
    title: "ROUTE @광교",
    description:
      "숲길에서 펼쳐지는 팀 전략 게임. 2026.11.14 수원 광교산, 32명 한정 모집.",
    images: ["/events/og.png"],
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
    sub: "최대 4명 단체 신청 · 4인 1팀 × 8팀 (2인 1조 이동)",
  },
  {
    icon: Wallet,
    label: "참가비",
    value: `${EV.fee.toLocaleString()}원`,
    sub: "2인·4인 신청 10% 할인 · 보급·기념품·기록 포함",
  },
] as const

const RULES = [
  {
    icon: Users,
    title: "4명 한 팀, 2명씩 한 조",
    desc: "팀 안에서 2인 1조로 나뉘어 움직이고, 조마다 트래커를 하나씩 들어요. 팀 점수는 두 조가 찍은 체크포인트를 합쳐 계산하니, 갈라져서 다른 곳을 찍는 쪽이 이득이에요.",
  },
  {
    icon: Compass,
    title: "작전 타임, 그리고 목표 선언",
    desc: "출발 전 지도와 배점을 보고 두 조의 동선을 짜요. 그리고 팀의 목표를 선언해요 — “우리는 오늘 몇 점.” 남을 이기는 게 아니라 우리 팀을 정확히 읽는 게 승부예요.",
  },
  {
    icon: Navigation,
    title: "26곳, 순서도 경로도 자유",
    desc: "체크포인트 26곳을 어떤 순서로 어떻게 돌아도 괜찮아요. 다만 4시간 안에 전부 도는 건 불가능해요. 어디를 가고 어디를 버릴지가 이 게임의 전부예요.",
  },
  {
    icon: Lock,
    title: "네 색을 모아 50을 찍으면 100점",
    desc: "10·20·30·40점 스탬프 한 세트를 가진 채 50점을 찍으면 보너스 50점이 붙어 100점이 돼요. 세트는 그때 소모 — 또 다른 50점에서 보너스를 받으려면 네 가지 색을 새로 모아야 해요. 세트 없이 찍으면 50점만 받아요.",
  },
  {
    icon: Footprints,
    title: "두 발로만",
    desc: "자전거·킥보드 등 탈것은 쓸 수 없어요. 걷거나 달려서 모은 점수만 인정돼요.",
  },
  {
    icon: Ticket,
    title: "모은 점수는 기념품과 추첨권으로",
    desc: "300점을 모으면 기념품함이 열리고, 넘긴 점수는 추첨권으로 바꿔 피니시 경품 추첨에 써요. 많이 돌수록 장수는 늘지만 당첨은 운이에요.",
  },
  {
    icon: Clock,
    title: "4시간 — 늦으면 1분마다 −10점",
    desc: "마감을 넘기면 1분마다 10점씩 깎여요. “하나만 더 찍고 갈까”의 아슬아슬함이 마지막까지 이어져요. 4시간 뒤 모두 광교산 산림욕장에 모여 티타임을 함께하고, 많이 늦어지면 관제가 확인하고 운영진이 찾아가요.",
  },
] as const

const PROVIDED = [
  {
    icon: Navigation,
    text: "광교산 산림욕장 집결 · 주차: 수원시환경성질환아토피센터",
    href: "https://naver.me/xnhfZnLP",
  },
  { icon: Package, text: "파밍박스·파밍백 보급 (물·음료·에너지젤)" },
  { icon: Radio, text: "실시간 GPS 관제 — 가족·지인 응원 시청" },
  { icon: Gift, text: "기념품 + 티타임 경품 추첨" },
  { icon: Flag, text: "사진·영상 기록 제공" },
] as const

const SAFETY = [
  "2인 1조 이동이 원칙이에요. 혼자 다니지 않아요.",
  "운영본부가 전원의 위치를 실시간으로 봐요.",
  "제한 시각까지 광교산 산림욕장 복귀가 원칙이고, 늦어지면 운영진이 위치를 확인해 찾아가요.",
  "언제든 기권할 수 있어요. 가장 가까운 날머리로 안내할게요.",
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
  const hasCoords = CPS.length > 0

  return (
    <main className="mx-auto max-w-6xl px-6">
      {/* 헤더 */}
      <header className="flex h-16 items-center justify-between">
        <Link href="/" className="text-sm font-bold tracking-tight">
          HILLY HEALLY <span className="text-muted-foreground">GROUND</span>
        </Link>
        <div className="flex items-center gap-1.5">
          <SignupSheet>
            <Button
              size="sm"
              className="bg-[#DC2F55] text-white hover:bg-[#DC2F55]/90"
            >
              신청하기
            </Button>
          </SignupSheet>
          <UserChip />
        </div>
      </header>

      {/* 히어로 */}
      <section className="py-14 sm:py-20">
        <Reveal>
          <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#DC2F55]" />
            2026. 11. 14. 토요일 · 수원 광교산
          </p>
          <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tighter sm:text-5xl xl:text-6xl">
            <span className="tracking-[0.3em]">ROUTE</span>
            <span className="ml-1 text-[#DC2F55]">@광교</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            숲길에서 펼쳐지는 팀 전략 게임. 배점이 다른 체크포인트 26곳을 자유
            순서로 모으고, 4시간 안에 광교산 산림욕장으로 돌아와요.
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
            날도 있어요. 이번 ROUTE @광교는{" "}
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
            체크포인트 {COURSE.cpCount}곳 · 총 {totalPoints()}점
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            멀고 높을수록 점수가 커요. 출발과 도착은 {COURSE.startName}이에요.
          </p>
        </Reveal>

        <div className="mt-8 grid gap-4 lg:grid-cols-5">
          <Reveal className="lg:col-span-3">
            <div className="overflow-hidden rounded-2xl border bg-card">
              {hasCoords ? (
                <CourseMapLazy className="h-[420px] w-full sm:h-[520px]" />
              ) : (
                <Image
                  src="/events/course.jpg"
                  alt="광교산 스탬프 게임 코스 지도"
                  width={1600}
                  height={1468}
                  className="h-auto w-full"
                  priority
                />
              )}
              <p className="border-t px-6 py-4 text-xs leading-relaxed text-muted-foreground">
                배치는 예시예요. 실제 체크포인트 위치는 답사에서 확정해
                참가자에게 안내해요.
              </p>
            </div>
          </Reveal>

          <div className="space-y-4 lg:col-span-2">
            <Reveal delay={0.08}>
              <div className="rounded-2xl border bg-card">
                <div className="border-b px-6 py-4">
                  <span className="font-semibold">배점</span>
                  <p className="mt-1 text-xs text-muted-foreground">
                    멀고 높은 곳일수록 큰 점수
                  </p>
                </div>
                <ul>
                  {TIERS.map((t) => (
                    <li
                      key={t}
                      className="flex items-center gap-3 border-b px-6 py-2.5 text-sm last:border-0"
                    >
                      <span
                        className="h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-background"
                        style={{ backgroundColor: TIER_COLOR[t] }}
                      />
                      <span className="font-semibold tabular-nums">{t}점</span>
                      <span className="text-xs text-muted-foreground">
                        {t === 50
                          ? "정상·최원거리"
                          : t === 40
                            ? "주요 봉우리"
                            : t === 30
                              ? "능선·갈림길"
                              : t === 20
                                ? "산중 지점"
                                : "초입·가까운 곳"}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="border-t px-6 py-3 text-xs leading-relaxed text-muted-foreground">
                  🔑 10·20·30·40 세트를 모아 50을 찍으면{" "}
                  <b className="font-semibold text-foreground">
                    보너스 +50 (총 100점)
                  </b>{" "}
                  · 세트는 소모돼요
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.14}>
              <div className="rounded-2xl border border-[#DC2F55]/30 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(220,47,85,0.10),transparent_55%)] p-6">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <b className="font-semibold text-foreground">
                    10·20·30·40점 한 세트
                  </b>
                  를 모은 채 50점을 찍으면{" "}
                  <b className="font-semibold text-foreground">
                    보너스 +50, 총 100점
                  </b>
                  이에요 (세트 소모). 다음 50점 보너스엔 새 세트가 필요하고,
                  세트 없이 찍으면 50점만 받아요. 순서는 전부 자유예요.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.2}>
              <dl className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border bg-card px-5 py-4">
                  <dt className="text-xs text-muted-foreground">제한 시간</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums">
                    {COURSE.timeLimitHours}시간{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      · 초과 1분당 −10점
                    </span>
                  </dd>
                </div>
                <div className="rounded-2xl border bg-card px-5 py-4">
                  <dt className="text-xs text-muted-foreground">이동 수단</dt>
                  <dd className="mt-0.5 font-semibold">두 발로만</dd>
                </div>
                <div className="col-span-2 rounded-2xl border bg-card px-5 py-4">
                  <dt className="text-xs text-muted-foreground">
                    기념품함 개봉 기준
                  </dt>
                  <dd className="mt-0.5 font-semibold tabular-nums">
                    300점{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      · 넘긴 점수는 추첨권으로
                    </span>
                  </dd>
                </div>
              </dl>
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
                      {"href" in p ? (
                        <a
                          href={p.href}
                          target="_blank"
                          rel="noreferrer"
                          className="underline decoration-muted-foreground/40 underline-offset-4 hover:text-[#DC2F55]"
                        >
                          {p.text} ↗
                        </a>
                      ) : (
                        p.text
                      )}
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
                운영본부가 처음부터 끝까지 전원의 위치를 지켜봐요
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

      {/* 푸터 — hillyheally.com 홈과 동일한 레이아웃·문구 */}
      <footer className="border-t py-12 text-sm text-muted-foreground">
        <div className="space-y-1.5">
          <div className="mb-4 flex items-center gap-2">
            <Image
              src="/images/logo.png"
              alt="Hilly Heally 로고"
              width={40}
              height={40}
            />
            <span className="text-xl font-bold text-foreground">
              Hilly Heally
            </span>
          </div>
          <p>상호명: 주식회사 힐리힐리</p>
          <p>대표자: 박준섭</p>
          <p>주소: 서울시 서초구 서초중앙로 123, 지하 1층 1003호</p>
          <p>사업자번호: 720-86-03798</p>
          <p>Tel: 1800-5191 FAX: 02-6455-6023</p>
          <p>Mail: service@hillyheally.com</p>
        </div>
        <div className="mt-8 border-t pt-8 text-center">
          <p>&copy; 2025 Hilly Heally. All rights reserved.</p>
          <div className="mt-3 flex items-center justify-center gap-6">
            <a
              href="https://hillyheally.com/terms"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-foreground"
            >
              서비스 이용약관
            </a>
            <span className="text-border">|</span>
            <a
              href="https://hillyheally.com/privacy-policy"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-foreground"
            >
              개인정보처리방침
            </a>
            <span className="text-border">|</span>
            <a
              href="https://hillyheally.com/delete-account"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-foreground"
            >
              계정 삭제
            </a>
          </div>
        </div>
      </footer>
    </main>
  )
}
