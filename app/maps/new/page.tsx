import Link from "next/link"
import { Route, Stamp } from "lucide-react"

const OPTIONS = [
  {
    href: "/maps/new/course",
    icon: Route,
    title: "코스지도",
    description:
      "GPX 파일을 올려 경로를 만들고, 경로 위에 체크포인트를 배치해요. 등산·러닝 코스에 좋아요.",
  },
  {
    href: "/maps/new/stamp",
    icon: Stamp,
    title: "스탬프지도",
    description:
      "경로 없이 지도를 클릭해 스탬프 포인트를 배치해요. 동네 투어·보물찾기에 좋아요.",
  },
] as const

export default function NewMapPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold">어떤 지도를 만들까요?</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {OPTIONS.map((opt) => (
          <Link
            key={opt.href}
            href={opt.href}
            className="group rounded-2xl border bg-card p-6 transition-all hover:border-foreground/30 hover:shadow-md"
          >
            <opt.icon className="h-8 w-8 text-muted-foreground transition-colors group-hover:text-foreground" />
            <p className="mt-4 text-lg font-semibold">{opt.title}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {opt.description}
            </p>
          </Link>
        ))}
      </div>
    </main>
  )
}
