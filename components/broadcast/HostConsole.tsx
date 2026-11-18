"use client"

import { useState } from "react"
import { Link2, Radio, Square } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { broadcastRepo } from "@/lib/repos/broadcastRepo"
import type { PublicBroadcast } from "@/lib/repos/broadcastTypes"
import { shareLink } from "@/lib/share-link"

/** 방송 공개 주소 — 모험은 /live/<slug>, 트래커 이벤트는 /watch/<token> */
export function broadcastUrl(b: PublicBroadcast): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://map.hillyheally.com"
  if (b.kind === "tracker_event" && b.public_token) return `${origin}/watch/${b.public_token}`
  return `${origin}/live/${b.slug ?? b.id}`
}

/**
 * 진행자 콘솔 — 관제 화면(설정 탭·모험 라이브)에서 방송을 다룬다: 채팅 열고 닫기, 소개글, 링크 공유, 종료/재개.
 * 라디오·후원 스위치는 다음 단계에서 켠다(지금은 안내만).
 */
export default function HostConsole({
  broadcast,
  onChanged,
  className,
}: {
  broadcast: PublicBroadcast
  onChanged: (b: PublicBroadcast | null) => void
  className?: string
}) {
  const [intro, setIntro] = useState(broadcast.intro ?? "")
  const [busy, setBusy] = useState(false)
  const live = broadcast.status === "live"

  async function run(fn: () => Promise<PublicBroadcast | null>, ok?: string) {
    setBusy(true)
    try {
      const b = await fn()
      onChanged(b)
      if (ok) toast.success(ok)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "처리하지 못했어요.")
    } finally {
      setBusy(false)
    }
  }

  async function share() {
    const r = await shareLink(broadcastUrl(broadcast), `${broadcast.title} · 힐리힐리 LIVE`)
    if (r === "copied") toast.success("중계 링크를 복사했어요.")
    else if (r === "failed") toast.error("공유하지 못했어요.")
  }

  return (
    <div className={"space-y-4 rounded-xl border p-4 " + (className ?? "")}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-bold">
            <Radio className={"h-4 w-4 " + (live ? "text-[#DC2F55]" : "text-muted-foreground")} />
            라이브 중계
            <span
              className={
                "rounded-full px-2 py-px text-[10px] font-extrabold " +
                (live ? "bg-[#DC2F55] text-white" : "bg-muted text-muted-foreground")
              }
            >
              {live ? "LIVE" : "종료"}
            </span>
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {broadcastUrl(broadcast).replace(/^https?:\/\//, "")}
            {" · "}응원 {broadcast.message_count}개
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void share()}>
          <Link2 className="mr-1.5 h-4 w-4" />
          링크 공유
        </Button>
      </div>

      <label className="flex items-center justify-between gap-3 text-sm">
        <span>
          관전 채팅
          <span className="block text-xs text-muted-foreground">끄면 진행자만 쓸 수 있어요</span>
        </span>
        <Switch
          checked={broadcast.chat_enabled}
          disabled={busy}
          onCheckedChange={(v) =>
            void run(() => broadcastRepo.updateSettings(broadcast.id, { chat_enabled: v }))
          }
        />
      </label>
      <label className="flex items-center justify-between gap-3 text-sm opacity-60">
        <span>
          후원 받기
          <span className="block text-xs text-muted-foreground">준비 중 — 곧 열려요</span>
        </span>
        <Switch checked={false} disabled />
      </label>
      <label className="flex items-center justify-between gap-3 text-sm opacity-60">
        <span>
          라디오 중계
          <span className="block text-xs text-muted-foreground">준비 중 — 곧 열려요</span>
        </span>
        <Switch checked={false} disabled />
      </label>

      <div className="space-y-1.5">
        <p className="text-xs font-semibold">소개글</p>
        <textarea
          value={intro}
          onChange={(e) => setIntro(e.target.value.slice(0, 300))}
          rows={3}
          placeholder="이 도전을 한 줄로 소개해 주세요 (300자)"
          className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#DC2F55]/40"
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            disabled={busy || intro === (broadcast.intro ?? "")}
            onClick={() =>
              void run(() => broadcastRepo.updateSettings(broadcast.id, { intro }), "소개글을 저장했어요.")
            }
          >
            저장
          </Button>
        </div>
      </div>

      <div className="flex justify-end border-t pt-3">
        {live ? (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            className="text-red-600 hover:text-red-700"
            onClick={() => {
              if (!window.confirm("중계를 끝낼까요? 지도와 채팅은 그대로 보이지만 새 글은 못 써요.")) return
              void run(() => broadcastRepo.setStatus(broadcast.id, "ended"), "중계를 끝냈어요.")
            }}
          >
            <Square className="mr-1.5 h-3.5 w-3.5" />
            중계 끝내기
          </Button>
        ) : (
          <Button
            size="sm"
            disabled={busy}
            className="bg-[#DC2F55] text-white hover:bg-[#DC2F55]/90"
            onClick={() => void run(() => broadcastRepo.setStatus(broadcast.id, "live"), "중계를 다시 켰어요.")}
          >
            <Radio className="mr-1.5 h-3.5 w-3.5" />
            다시 켜기
          </Button>
        )}
      </div>
    </div>
  )
}
