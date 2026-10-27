import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import {
  Backpack,
  CalendarDays,
  Clock,
  Compass,
  Flag,
  Gift,
  MapPin,
  Navigation,
  Package,
  Radio,
  ShieldCheck,
  Handshake,
  Ticket,
  Users,
  Wallet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Reveal } from "@/components/landing/Reveal"
import { CourseMapLazy } from "@/components/events/CourseMapLazy"
import { NATSEONGOT as EV } from "@/lib/events"
import { COURSE, CPS, TIERS, TIER_COLOR } from "@/lib/events/gwanggyo-cps"
import { SignupSheet } from "./SignupSheet"
import { UserChip } from "./UserChip"

export const metadata: Metadata = {
  title: "ROUTE @광교산 | 힐리힐리",
  description:
    "2026.11.14 수원 광교산. 배점이 다른 체크포인트를 4시간 안에 원하는 순서로 모으는 팀 전략 게임. 순위는 없고 팀이 정한 목표만 있어요. 32명 한정.",
  openGraph: {
    title: "ROUTE @광교산",
    description:
      "산과 들에서 펼쳐지는 팀 전략 게임. 2026.11.14 수원 광교산, 32명 한정 모집.",
    images: ["/events/og-route-gwanggyosan-v2.png"],
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
    sub: "4명씩 8팀, 최대 4명까지 함께 신청",
  },
  {
    icon: Wallet,
    label: "참가비",
    value: `${EV.fee.toLocaleString()}원`,
    sub: "2인 이상 10% 할인, 보급과 추첨 포함",
  },
] as const

const B = ({ children }: { children: React.ReactNode }) => (
  <b className="font-semibold text-foreground">{children}</b>
)

const RULES = [
  {
    icon: Users,
    title: "4명 한 팀, 2명씩 한 조",
    desc: (
      <>
        팀 안에서 <B>2인 1조</B>로 나뉘어 움직이고 조마다 트래커를 하나씩
        들어요. 스탬프는 <B>같은 조 짝꿍이 50m 안에 함께 있어야</B> 인정돼요.
        팀 점수는 두 조가 찍은 곳을 합쳐 계산하고 같은 곳은 한 번만
        쳐줘요.
      </>
    ),
  },
  {
    icon: Compass,
    title: "시작과 함께 지도 공개, 그리고 목표 선언",
    desc: (
      <>
        체크포인트 위치는 <B>모험이 시작되는 순간</B>에야 공개돼요. 미리
        외워 올 수 없어요. 공개된 지도와 배점을 보고 그 자리에서 두 조의
        동선을 짜고 팀의 목표를 선언해요 — “우리는 오늘 몇 점.” 남을 이기는
        게 아니라 <B>우리 팀을 정확히 읽는 게 승부</B>예요.
      </>
    ),
  },
  {
    icon: Navigation,
    title: "순서도 경로도 자유",
    desc: (
      <>
        체크포인트를 어떤 순서로 어떻게 돌아도 괜찮아요. 다만{" "}
        <B>4시간 안에 전부 도는 건 불가능</B>해요. 어디를 가고 어디를 버릴지가
        이 게임의 전부예요.
      </>
    ),
  },
  {
    icon: Handshake,
    title: "4명이 함께 찍으면 점수 ×2",
    desc: (
      <>
        팀원 4명이 모두 한자리(50m 안)에 모여 찍은 스탬프는{" "}
        <B>점수가 두 배</B>예요. 갈라져서 더 많은 곳을 찍을지, 모여서 크게
        찍을지 — <B>팀의 선택</B>이에요.
      </>
    ),
  },
  {
    icon: Ticket,
    title: "모은 점수로 추첨",
    desc: (
      <>
        17:00 피니시에서 <B>모은 점수를 써서 차례대로 추첨권을 뽑아요.</B> 당첨이면 상품을 받고,
        꽝일 수도 있어요. 많이 모을수록 여러 번 뽑을 수 있지만
        당첨은 운이에요.
      </>
    ),
  },
  {
    icon: Clock,
    title: (
      <>
        두 발로 4시간 — 늦으면 1분마다{" "}
        <span className="text-[#DC2F55]">−10점</span>
      </>
    ),
    desc: (
      <>
        탈것 없이 <B>걷거나 달려서</B> 모은 점수만 인정돼요. 마감을 넘기면{" "}
        <B>1분마다 10점씩</B> 깎여요. 많이 늦어지면 관제가 확인하고 운영진이
        찾아가요.
      </>
    ),
  },
] as const

/** 게임 방법 — 처음 보는 사람도 순서대로 따라올 수 있게 */
const HOW_TO_PLAY = [
  {
    title: "12:00 집결",
    desc: "서로 인사를 나누고 준비체조로 몸을 풀어요. 4명 한 팀, 그 안에서 2명씩 두 조를 확인하고 조마다 트래커를 받아요.",
  },
  {
    title: "13:00 시작과 함께 지도 공개",
    desc: "체크포인트 위치와 배점을 보고 동선을 짠 뒤, 팀 목표 점수를 선언하고 출발해요.",
  },
  {
    title: "짝꿍과 함께 도착하면 스탬프",
    desc: "체크포인트에 가면 앱이 위치로 도착을 확인해요. 같은 조 짝꿍이 50m 안에 있어야 인정돼요.",
  },
  {
    title: "10~50점 모으기",
    desc: "멀고 높은 곳일수록 큰 점수예요. 팀 4명이 함께 찍으면 그곳 점수는 2배예요.",
  },
  {
    title: "17:00까지 산림욕장으로 복귀",
    desc: "늦으면 1분마다 −10점이에요. 돌아와서 선언한 목표와 비교해요.",
  },
  {
    title: "모은 점수로 추첨",
    desc: "점수를 써서 차례대로 추첨권을 뽑아요. 당첨 또는 꽝!",
  },
]

/** 당일 흐름 */
const TIMELINE = [
  {
    time: "12:00",
    title: "광교산 산림욕장에 집결",
    desc: "밍글링과 준비체조, 팀 확인과 안내",
    link: {
      label: "주차: 수원시환경성질환아토피센터",
      href: "https://naver.me/xnhfZnLP",
    },
  },
  {
    time: "13:00",
    title: "모험 시작, 지도 공개",
    desc: "그 자리에서 동선을 짜고 목표를 선언한 뒤 출발",
    highlight: true,
  },
  {
    time: "17:00",
    title: "마감, 산림욕장으로 복귀",
    desc: "티타임을 하며 소감을 나누고, 모은 점수로 추첨해요",
  },
  {
    time: "18:00",
    title: "자선농원으로 이동",
    desc: "다 같이 뒤풀이 장소로 옮겨요",
    href: "https://naver.me/F3Tj4xUX",
  },
  {
    time: "18:30",
    title: "자선농원에서 저녁 식사",
    desc: "소감을 마저 나누며 함께 먹어요 (신청 시 참석 여부 선택)",
  },
] as const

const PROVIDED = [
  {
    icon: Package,
    text: "파밍박스 — 코스 곳곳에 에너지를 채울 먹을거리와 마실거리, 체험품을 넣어 둬요",
  },
  {
    icon: Radio,
    text: "실시간 GPS 관제 — 가족과 지인이 보며 응원할 수 있는 링크 (모험이 시작되면 열려요)",
    href: "/events/route-gg-san/live",
  },
  { icon: Gift, text: "모은 점수로 추첨 (당첨 또는 꽝)" },
  { icon: Flag, text: "사진과 영상 기록 제공" },
] as const

const SAFETY = [
  "2인 1조 이동이 원칙이에요. 혼자 다니지 않아요.",
  "운영본부가 전원의 위치를 실시간으로 봐요.",
  "제한 시각까지 광교산 산림욕장 복귀가 원칙이고, 늦어지면 운영진이 위치를 확인해 찾아가요.",
  "언제든 기권할 수 있어요. 가장 가까운 날머리로 안내할게요.",
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
    <main className="mx-auto max-w-6xl break-keep px-6">
      {/* 헤더 */}
      <header className="flex h-16 items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-bold tracking-tight"
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
            <span className="hidden text-muted-foreground sm:inline">
              GROUND
            </span>
          </span>
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
            2026년 11월 14일 토요일, 수원 광교산
          </p>
          <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tighter sm:text-5xl xl:text-6xl">
            ROUTE <span className="text-[#DC2F55]">@광교산</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            산과 들에서 펼쳐지는 팀 전략 게임.
            <br />
            배점이 다른 체크포인트를 원하는 순서로 모으고 제한 시간 안에
            출발점으로 돌아오세요.
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
              <div className="h-full rounded-2xl border bg-card px-5 py-4 transition-colors hover:border-foreground/20">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <f.icon
                    className="h-3.5 w-3.5 text-[#DC2F55]"
                    strokeWidth={1.75}
                  />
                  {f.label}
                </p>
                <p className="mt-2 font-semibold leading-snug">{f.value}</p>
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
          <p className="text-sm font-bold tracking-[0.2em] text-[#DC2F55]">
            WHY
          </p>
          <h2 className="mt-4 text-2xl font-bold leading-snug tracking-tighter sm:text-4xl">
            <span className="text-[#DC2F55]">
              나를 알고, 길을 알고, 안전하게.
            </span>
          </h2>
          <p className="mt-7 text-base leading-relaxed text-muted-foreground">
            누군가 지나간 길은 쉽습니다. 가본 적 없는 나의 길은 낯설고, 조금
            두렵습니다.
            <br />
            <span className="whitespace-nowrap">ROUTE @광교산은</span>{" "}
            <b className="font-semibold text-foreground">
              그 낯선 길을 찾아 나서는 날
            </b>
            입니다.
          </p>
          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
            <b className="font-semibold text-foreground">순위는 없습니다.</b>
            <br />
            빨리 달리지 않아도 됩니다. 내 속도로, 길고 오래.
            <br />
            흔들려도 뿌리를 잃지 않고 끝까지 나아가는 것 — 우리는 그걸{" "}
            <b className="font-semibold text-foreground">노련함</b>이라고
            부릅니다.
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
            경쟁은 덜고 어디로 갈지 고르는 재미만 남겼어요.
          </p>
        </Reveal>

        <Reveal>
          <ol className="mt-8 grid gap-x-8 gap-y-5 rounded-2xl border bg-card px-5 py-5 sm:grid-cols-2">
            {HOW_TO_PLAY.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#DC2F55]/15 text-xs font-bold text-[#DC2F55]">
                  {i + 1}
                </span>
                <span>
                  <span className="block text-sm font-semibold">
                    {step.title}
                  </span>
                  <span className="mt-0.5 block text-sm leading-relaxed text-muted-foreground">
                    {step.desc}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </Reveal>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {RULES.map((r, i) => (
            <Reveal key={i} delay={(i % 3) * 0.06}>
              <div className="h-full rounded-2xl border bg-card px-5 py-5 transition-colors hover:border-foreground/20">
                <p className="flex items-start gap-2 font-semibold leading-snug">
                  <r.icon
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#DC2F55]"
                    strokeWidth={1.75}
                  />
                  <span>{r.title}</span>
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {r.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <h3 className="mt-16 text-lg font-semibold tracking-tight">
            당일 흐름
          </h3>
        </Reveal>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {TIMELINE.map((t, i) => (
            <Reveal key={t.time} delay={i * 0.06}>
              <div
                className={`h-full rounded-2xl border p-5 ${
                  "highlight" in t
                    ? "border-[#DC2F55]/40 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(220,47,85,0.12),transparent_60%)]"
                    : "bg-card"
                }`}
              >
                <p className="font-mono text-sm font-semibold text-[#DC2F55] tabular-nums">
                  {t.time}
                </p>
                <p className="mt-2 font-semibold">
                  {"href" in t ? (
                    <a
                      href={t.href}
                      target="_blank"
                      rel="noreferrer"
                      className="underline decoration-muted-foreground/40 underline-offset-4 hover:text-[#DC2F55]"
                    >
                      {t.title} ↗
                    </a>
                  ) : (
                    t.title
                  )}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {t.desc}
                </p>
                {"link" in t && (
                  <a
                    href={t.link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-xs text-muted-foreground underline decoration-muted-foreground/40 underline-offset-4 hover:text-[#DC2F55]"
                  >
                    {t.link.label} ↗
                  </a>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 코스 */}
      <section id="course" className="scroll-mt-8 border-t py-20">
        <Reveal>
          <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl">
            배점이 다른 체크포인트
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
                지금 지도의 스탬프는 게임 감을 잡기 위한 예시 배치예요. 실제
                체크포인트 위치는 모험이 시작되는 순간 이 지도에서 일제히
                공개돼요.
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
                      className="flex items-center gap-3.5 border-b px-6 py-3 text-sm last:border-0"
                    >
                      {/* 지도 스탬프 마커와 같은 모양 — 배점 색 원, 흰 테두리, 점선 링, 흰 숫자 */}
                      <span
                        className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border-2 border-white text-[11px] font-extrabold tabular-nums text-white shadow"
                        style={{
                          backgroundColor: TIER_COLOR[t],
                          outline: `2px dashed ${TIER_COLOR[t]}`,
                          outlineOffset: "1.5px",
                        }}
                      >
                        {t}
                      </span>
                      <span className="font-semibold tabular-nums">{t}점</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>


            <Reveal delay={0.14}>
              <dl className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border bg-card px-5 py-4">
                  <dt className="text-xs text-muted-foreground">제한 시간</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums">
                    {COURSE.timeLimitHours}시간{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      (넘기면 1분에 −10점)
                    </span>
                  </dd>
                </div>
                <div className="rounded-2xl border bg-card px-5 py-4">
                  <dt className="text-xs text-muted-foreground">이동 수단</dt>
                  <dd className="mt-0.5 font-semibold">두 발로만</dd>
                </div>
                <div className="col-span-2 rounded-2xl border bg-card px-5 py-4">
                  <dt className="text-xs text-muted-foreground">
                    모은 점수는
                  </dt>
                  <dd className="mt-0.5 font-semibold">
                    추첨에 써요{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      점수를 내고 추첨권을 뽑아요. 당첨 아니면 꽝!
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
                1인 {EV.fee.toLocaleString()}원 (2인 이상 신청 시 10% 할인)
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
                <dd className="mt-0.5 text-xs text-muted-foreground">
                  2인 이상 10% 할인
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
      <footer className="border-t border-white/[0.05] py-12 text-sm text-gray-600">
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
        <div className="mt-8 border-t border-white/[0.05] pt-8 text-center">
          <p>&copy; 2025 Hilly Heally. All rights reserved.</p>
          <div className="mt-3 flex items-center justify-center gap-6">
            <a
              href="https://hillyheally.com/terms"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-white"
            >
              서비스 이용약관
            </a>
            <span className="text-gray-700">|</span>
            <a
              href="https://hillyheally.com/privacy-policy"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-white"
            >
              개인정보처리방침
            </a>
            <span className="text-gray-700">|</span>
            <a
              href="https://hillyheally.com/delete-account"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-white"
            >
              계정 삭제
            </a>
          </div>
        </div>
      </footer>
    </main>
  )
}
