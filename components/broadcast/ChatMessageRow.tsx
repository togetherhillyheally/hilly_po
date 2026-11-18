"use client"

import { MoreHorizontal, Pin, PinOff, Trash2, VolumeX } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { BroadcastMessage, ModerateAction } from "@/lib/repos/broadcastTypes"
import { nameInitial } from "@/lib/entry-colors"

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
}

function durationLabel(ms: number | null) {
  if (ms == null) return ""
  const s = Math.round(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}

function Avatar({ name, url, host }: { name: string; url: string | null; host: boolean }) {
  return (
    <span
      className={
        "flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full text-[11px] font-bold text-white " +
        (host ? "bg-[#DC2F55] ring-2 ring-[#DC2F55]/30" : "bg-foreground/30")
      }
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        nameInitial(name)
      )}
    </span>
  )
}

/**
 * 채팅 한 줄 — 진행자(호스트) 글은 빨간 아바타 링 + '진행자' 배지, 시스템 글은 가운데 회색, 후원 글은 강조 카드.
 * … 메뉴: 진행자는 핀·삭제·음소거, 본인 글은 삭제.
 */
export default function ChatMessageRow({
  m,
  mine,
  canModerate,
  onModerate,
  onMute,
}: {
  m: BroadcastMessage
  mine: boolean
  canModerate: boolean
  onModerate?: (id: string, action: ModerateAction) => void
  onMute?: (userId: string, nickname: string) => void
}) {
  if (m.kind === "system") {
    return (
      <p className="px-4 py-1.5 text-center text-[11px] text-muted-foreground">{m.content}</p>
    )
  }
  const name = m.nickname ?? "참가자"
  const showMenu = (canModerate || mine) && !!onModerate

  return (
    <div
      className={
        "group flex gap-2 px-3 py-1.5 " +
        (m.kind === "sponsor"
          ? "mx-2 my-1 rounded-xl border border-amber-300 bg-amber-50 py-2 dark:bg-amber-950/30"
          : m.is_host
            ? "bg-[#DC2F55]/[0.06]"
            : "")
      }
    >
      <Avatar name={name} url={m.avatar_url} host={m.is_host} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className={"truncate text-xs font-bold " + (m.is_host ? "text-[#DC2F55]" : "")}>
            {name}
          </span>
          {m.is_host && (
            <span className="rounded bg-[#DC2F55] px-1 py-px text-[9px] font-extrabold leading-tight text-white">
              진행자
            </span>
          )}
          {m.kind === "sponsor" && (
            <span className="rounded bg-amber-500 px-1 py-px text-[9px] font-extrabold leading-tight text-white">
              후원
            </span>
          )}
          <span className="ml-auto shrink-0 text-[10px] tabular-nums text-muted-foreground">
            {timeLabel(m.created_at)}
          </span>
          {showMenu && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="메시지 메뉴"
                  className="-mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="theme-light">
                {canModerate && (
                  <DropdownMenuItem onClick={() => onModerate?.(m.id, m.pinned ? "unpin" : "pin")}>
                    {m.pinned ? <PinOff className="mr-2 h-4 w-4" /> : <Pin className="mr-2 h-4 w-4" />}
                    {m.pinned ? "핀 해제" : "위에 고정"}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onModerate?.(m.id, "delete")}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  삭제
                </DropdownMenuItem>
                {canModerate && !m.is_host && m.user_id && onMute && (
                  <DropdownMenuItem onClick={() => onMute(m.user_id!, name)}>
                    <VolumeX className="mr-2 h-4 w-4" />
                    10분 음소거
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {m.kind === "voice" && m.audio_url ? (
          <div className="mt-1 flex items-center gap-2">
            <audio controls preload="none" src={m.audio_url} className="h-8 max-w-[220px]" />
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {durationLabel(m.audio_duration_ms)}
            </span>
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words text-sm leading-snug">{m.content}</p>
        )}
      </div>
    </div>
  )
}
