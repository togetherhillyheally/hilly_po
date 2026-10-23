import type { Metadata } from "next"
import { LiveGate } from "./LiveGate"

export const metadata: Metadata = {
  title: "ROUTE @광교 실시간 응원 | 힐리힐리",
  description:
    "2026.11.14 광교산, ROUTE @광교 팀들의 위치를 실시간으로 지켜보고 응원해요.",
  openGraph: {
    title: "ROUTE @광교 실시간 응원",
    description: "모험이 시작되면 팀들의 위치를 실시간으로 볼 수 있어요.",
    images: ["/events/og-route-gwanggyo-v2.png"],
  },
}

export default function LivePage() {
  return <LiveGate />
}
