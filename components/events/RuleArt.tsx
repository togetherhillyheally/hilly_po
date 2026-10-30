/** ROUTE 규칙 카드 위 작은 그림 — 글을 읽기 전에 규칙이 한눈에 보이게.
 *  색은 지도 배점 색(TIER_COLOR)과 브랜드 레드, 나머지는 currentColor 라 라이트·다크 모두 맞는다. */
import { TIER_COLOR } from "@/lib/events/gwanggyo-cps"

const RED = "#DC2F55"

export type RuleArtKind = "pair" | "reveal" | "route" | "draw" | "clock"

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 240 104"
      className="h-full w-full text-foreground"
      fill="none"
      aria-hidden
    >
      {children}
    </svg>
  )
}

/** 사람 아이콘 — 머리 + 어깨 */
function Person({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g>
      <circle cx={x} cy={y - 9} r={6} fill={color} />
      <path
        d={`M${x - 10} ${y + 12} q0 -13 10 -13 q10 0 10 13 z`}
        fill={color}
      />
    </g>
  )
}

/** 스탬프 포인트 — 지도 마커와 같은 배점 색 원 */
function Cp({
  x,
  y,
  pts,
  r = 11,
  faded = false,
}: {
  x: number
  y: number
  pts: 10 | 20 | 30 | 40 | 50
  r?: number
  faded?: boolean
}) {
  return (
    <g opacity={faded ? 0.3 : 1}>
      <circle cx={x} cy={y} r={r} fill={TIER_COLOR[pts]} stroke="white" strokeWidth={1.5} />
      <text
        x={x}
        y={y + 3.5}
        textAnchor="middle"
        fontSize={r * 0.9}
        fontWeight={700}
        fill="white"
      >
        {pts}
      </text>
    </g>
  )
}

/** 2인 1조 — 짝꿍 둘이 50m 안, 옆에 혼자 뛰는 개인전 */
function Pair() {
  return (
    <Frame>
      <circle
        cx={78}
        cy={52}
        r={40}
        stroke={RED}
        strokeOpacity={0.6}
        strokeDasharray="4 4"
      />
      <Person x={64} y={54} color="currentColor" />
      <Person x={92} y={54} color="currentColor" />
      {/* 조마다 트래커 하나 */}
      <rect x={100} y={60} width={10} height={14} rx={2.5} fill={RED} />
      <text x={78} y={24} textAnchor="middle" fontSize={10} fill={RED} fontWeight={600}>
        50m 안
      </text>
      <text x={78} y={100} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.6}>
        짝꿍과 2인 1조
      </text>
      <line x1={138} y1={18} x2={138} y2={88} stroke="currentColor" strokeOpacity={0.15} />
      <g opacity={0.75}>
        <Person x={188} y={54} color="currentColor" />
        <rect x={196} y={60} width={10} height={14} rx={2.5} fill={RED} />
      </g>
      <text x={188} y={100} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.6}>
        또는 개인전
      </text>
    </Frame>
  )
}

/** 시작과 함께 지도 공개 — 가려진 지도 → 배점 포인트, 목표 선언 */
function Reveal() {
  return (
    <Frame>
      {/* 가려진 지도 */}
      <path d="M14 22 l26 -8 l26 8 l26 -8 v66 l-26 8 l-26 -8 l-26 8 z" fill="currentColor" fillOpacity={0.08} stroke="currentColor" strokeOpacity={0.25} />
      <text x={53} y={58} textAnchor="middle" fontSize={26} fontWeight={700} fill="currentColor" opacity={0.35}>
        ?
      </text>
      <text x={53} y={100} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.6}>
        시작 전
      </text>
      <path d="M104 52 h18 m-6 -6 l6 6 l-6 6" stroke={RED} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {/* 공개된 지도 */}
      <path d="M134 22 l26 -8 l26 8 l26 -8 v66 l-26 8 l-26 -8 l-26 8 z" fill="currentColor" fillOpacity={0.05} stroke="currentColor" strokeOpacity={0.25} />
      <Cp x={152} y={38} pts={10} r={8} />
      <Cp x={194} y={30} pts={40} r={8} />
      <Cp x={170} y={62} pts={20} r={8} />
      <Cp x={200} y={66} pts={50} r={8} />
      <text x={173} y={100} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.6}>
        13:00 공개
      </text>
    </Frame>
  )
}

/** 순서도 경로도 자유 — 몇 곳만 골라 도는 동선, 나머지는 버림 */
function Route() {
  return (
    <Frame>
      <path
        d="M24 82 C 40 50, 56 40, 70 34 S 108 20, 122 44 S 160 86, 182 64 S 206 30, 214 26"
        stroke={RED}
        strokeWidth={2}
        strokeDasharray="5 4"
        strokeLinecap="round"
      />
      <circle cx={24} cy={82} r={7} fill="currentColor" />
      <text x={24} y={85.5} textAnchor="middle" fontSize={8} fontWeight={700} className="fill-background">
        S
      </text>
      <Cp x={70} y={34} pts={20} />
      <Cp x={122} y={44} pts={30} />
      <Cp x={182} y={64} pts={40} />
      <Cp x={214} y={26} pts={50} />
      <Cp x={64} y={80} pts={10} faded />
      <Cp x={150} y={18} pts={30} faded />
      <Cp x={226} y={88} pts={20} faded />
    </Frame>
  )
}

/** 모은 점수로 추첨 — 100점마다 1장, 목표 적중 +2장 */
function Ticket({ x, y, label, accent }: { x: number; y: number; label: string; accent: string }) {
  return (
    <g>
      <path
        d={`M${x} ${y} h44 a5 5 0 0 0 0 10 v12 a5 5 0 0 0 0 10 h-44 a5 5 0 0 0 0 -10 v-12 a5 5 0 0 0 0 -10 z`}
        fill={accent}
        fillOpacity={0.15}
        stroke={accent}
        strokeWidth={1.5}
      />
      <text x={x + 22} y={y + 20} textAnchor="middle" fontSize={11} fontWeight={700} fill={accent}>
        {label}
      </text>
    </g>
  )
}

function Draw() {
  return (
    <Frame>
      <text x={40} y={34} textAnchor="middle" fontSize={20} fontWeight={800} fill="currentColor">
        100
      </text>
      <text x={40} y={50} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.6}>
        점마다
      </text>
      <path d="M70 34 h14 m-5 -5 l5 5 l-5 5" stroke="currentColor" strokeOpacity={0.5} strokeWidth={1.5} strokeLinecap="round" />
      <Ticket x={94} y={18} label="1장" accent="currentColor" />
      <text x={116} y={74} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.6}>
        추첨권
      </text>
      <text x={168} y={38} textAnchor="middle" fontSize={16} fontWeight={700} fill={RED}>
        +
      </text>
      <Ticket x={180} y={18} label="+2장" accent={RED} />
      <text x={202} y={74} textAnchor="middle" fontSize={10} fill={RED}>
        목표 적중
      </text>
      <text x={120} y={98} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.6}>
        당첨 또는 꽝
      </text>
    </Frame>
  )
}

/** 두 발로 4시간 — 13:00~17:00, 넘기면 1분마다 −10점 */
function Clock() {
  const cx = 62
  const cy = 52
  const r = 36
  // 시계판에서 13시(1시)~17시(5시) 구간 = 30°~150°
  const pt = (deg: number, rr = r) => {
    const a = ((deg - 90) * Math.PI) / 180
    return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)]
  }
  const [x1, y1] = pt(30)
  const [x2, y2] = pt(150)
  const [x3, y3] = pt(165)
  return (
    <Frame>
      <circle cx={cx} cy={cy} r={r} stroke="currentColor" strokeOpacity={0.2} strokeWidth={6} />
      <path d={`M${x1} ${y1} A${r} ${r} 0 0 1 ${x2} ${y2}`} stroke="currentColor" strokeWidth={6} strokeLinecap="round" />
      <path d={`M${x2} ${y2} A${r} ${r} 0 0 1 ${x3} ${y3}`} stroke={RED} strokeWidth={6} strokeLinecap="round" />
      <line x1={cx} y1={cy} x2={cx} y2={cy - 22} stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      <line x1={cx} y1={cy} x2={pt(150, 18)[0]} y2={pt(150, 18)[1]} stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={2.5} fill="currentColor" />
      <text x={128} y={40} fontSize={18} fontWeight={800} fill="currentColor">
        4시간
      </text>
      <text x={128} y={56} fontSize={10} fill="currentColor" opacity={0.6}>
        13:00 → 17:00, 두 발로만
      </text>
      <text x={128} y={82} fontSize={13} fontWeight={700} fill={RED}>
        늦으면 −10점/분
      </text>
    </Frame>
  )
}

export function RuleArt({ kind }: { kind: RuleArtKind }) {
  return (
    <div className="mb-4 h-28 rounded-xl bg-muted/40 px-3 py-2">
      {kind === "pair" && <Pair />}
      {kind === "reveal" && <Reveal />}
      {kind === "route" && <Route />}
      {kind === "draw" && <Draw />}
      {kind === "clock" && <Clock />}
    </div>
  )
}
