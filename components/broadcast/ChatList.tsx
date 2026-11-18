"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { ArrowDown } from "lucide-react"
import type { BroadcastMessage, ModerateAction } from "@/lib/repos/broadcastTypes"
import ChatMessageRow from "./ChatMessageRow"

/**
 * 메시지 목록 — 바닥 근처에 있으면 새 글에 따라 내려가고, 위로 올려 읽는 중이면 "새 메시지 N" 버튼만 띄운다.
 * 맨 위에서 "이전 대화 더 보기".
 */
export default function ChatList({
  messages,
  loading,
  hasOlder,
  loadingOlder,
  onLoadOlder,
  myUserId,
  canModerate,
  onModerate,
  onMute,
  inlineAd,
  className,
}: {
  messages: BroadcastMessage[]
  loading: boolean
  hasOlder: boolean
  loadingOlder: boolean
  onLoadOlder: () => void
  myUserId: string | null
  canModerate: boolean
  onModerate?: (id: string, action: ModerateAction) => void
  onMute?: (userId: string, nickname: string) => void
  /** 채팅 사이 광고 — 15개마다 한 번 */
  inlineAd?: React.ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [stuck, setStuck] = useState(true) // 바닥에 붙어 있음
  const [unseen, setUnseen] = useState(0)
  const lastCountRef = useRef(0)
  const prevHeightRef = useRef(0)

  const onScroll = () => {
    const el = ref.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60
    setStuck(nearBottom)
    if (nearBottom) setUnseen(0)
  }

  // 새 글: 붙어 있으면 내려가고, 아니면 안 본 개수만 센다. 이전 글 로드: 스크롤 위치 유지
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const grewAtTop = prevHeightRef.current > 0 && el.scrollTop < 40 && messages.length > lastCountRef.current && !stuck
    if (grewAtTop) {
      el.scrollTop += el.scrollHeight - prevHeightRef.current
    } else if (stuck) {
      el.scrollTop = el.scrollHeight
    } else if (messages.length > lastCountRef.current) {
      setUnseen((n) => n + (messages.length - lastCountRef.current))
    }
    lastCountRef.current = messages.length
    prevHeightRef.current = el.scrollHeight
  }, [messages, stuck])

  useEffect(() => {
    if (!loading && ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [loading])

  const jumpToBottom = () => {
    const el = ref.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
    setUnseen(0)
    setStuck(true)
  }

  return (
    <div className={"relative min-h-0 flex-1 " + (className ?? "")}>
      <div ref={ref} onScroll={onScroll} className="h-full overflow-y-auto overscroll-contain py-1">
        {hasOlder && (
          <button
            type="button"
            onClick={onLoadOlder}
            disabled={loadingOlder}
            className="mx-auto mb-1 block rounded-full border bg-background px-3 py-1 text-[11px] text-muted-foreground hover:bg-muted disabled:opacity-50"
          >
            {loadingOlder ? "불러오는 중…" : "이전 대화 더 보기"}
          </button>
        )}
        {loading && messages.length === 0 && (
          <p className="px-4 py-8 text-center text-xs text-muted-foreground">대화를 불러오는 중…</p>
        )}
        {!loading && messages.length === 0 && (
          <p className="px-4 py-8 text-center text-xs text-muted-foreground">
            아직 대화가 없어요. 첫 응원을 남겨 보세요.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={m.id}>
            <ChatMessageRow
              m={m}
              mine={!!myUserId && m.user_id === myUserId}
              canModerate={canModerate}
              onModerate={onModerate}
              onMute={onMute}
            />
            {inlineAd && i % 15 === 14 && inlineAd}
          </div>
        ))}
      </div>
      {unseen > 0 && (
        <button
          type="button"
          onClick={jumpToBottom}
          className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-[#DC2F55] px-3 py-1 text-xs font-bold text-white shadow-lg"
        >
          <ArrowDown className="h-3.5 w-3.5" />
          새 메시지 {unseen}
        </button>
      )}
    </div>
  )
}
