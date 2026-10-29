import { redirect } from "next/navigation"

/** 신청 내역 바로가기 — 확정 문자·디스코드에 넣는 짧은 주소 */
export default function MySignupShortcut() {
  redirect("/events/route-gg-san?mine=1")
}
