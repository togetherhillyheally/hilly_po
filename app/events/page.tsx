import type { Metadata } from "next"
import Link from "next/link"
import { CalendarDays, MapPin, Users } from "lucide-react"
import { SiteHeader } from "@/components/layout/SiteHeader"
import { EVENTS, type EventInfo } from "@/lib/events"

export const metadata: Metadata = {
  title: "이벤트 · 힐리힐리",
  description: "힐리힐리가 직접 여는 오프라인 이벤트",
}

const STATUS_LABEL: Record<NonNullable<EventInfo["listStatus"]>, string> = {
  recruiting: "모집 중",
  closed: "모집 마감",
  ended: "종료",
}

/** 이벤트 목록 — 헤더 "이벤트" 메뉴의 도착지. 카드를 누르면 각 이벤트 상세로 */
export default function EventsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-2xl font-bold">이벤트</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          힐리힐리가 직접 여는 오프라인 이벤트예요.
        </p>

        {EVENTS.length === 0 ? (
          <p className="mt-8 rounded-2xl border px-4 py-10 text-center text-sm text-muted-foreground">
            지금 열린 이벤트가 없어요.
          </p>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {EVENTS.map((ev) => {
              const status = ev.listStatus ?? "recruiting"
              return (
                <Link
                  key={ev.slug}
                  href={ev.path}
                  className="group overflow-hidden rounded-2xl border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/25 hover:shadow-lg"
                >
                  <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                    {ev.cover && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ev.cover}
                        alt={ev.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    )}
                    <span
                      className={
                        "absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold " +
                        (status === "recruiting"
                          ? "animate-pulse bg-[#DC2F55] text-white"
                          : "bg-background/85 text-muted-foreground")
                      }
                    >
                      {STATUS_LABEL[status]}
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="truncate text-base font-bold">{ev.title}</p>
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {ev.dateLabel}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {ev.placeLabel}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        정원 {ev.capacity}명
                      </span>
                    </p>
                    <p className="mt-3 text-sm font-semibold text-[#DC2F55]">
                      자세히 보기 →
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </>
  )
}
