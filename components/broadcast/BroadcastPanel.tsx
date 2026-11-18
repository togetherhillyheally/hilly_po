"use client"

import { Pin } from "lucide-react"
import { toast } from "sonner"
import { useBroadcastAds } from "@/hooks/use-broadcast-ads"
import { useBroadcastChat } from "@/hooks/use-broadcast-chat"
import { useCurrentUser } from "@/hooks/use-current-user"
import { broadcastRepo } from "@/lib/repos/broadcastRepo"
import type { PublicBroadcast } from "@/lib/repos/broadcastTypes"
import AdCard from "./AdCard"
import ChatComposer, { LoginPrompt } from "./ChatComposer"
import ChatList from "./ChatList"

/**
 * 관전 채팅 패널 — 핀 메시지 / 목록 / 입력창. 시트 탭 안이나 데스크톱 패널 안에서 세로를 꽉 채운다(flex-col).
 * 진행자(호스트·관리자)는 … 메뉴로 핀·삭제·음소거.
 */
export default function BroadcastPanel({
  broadcast,
  isHost,
  className,
}: {
  broadcast: PublicBroadcast
  isHost: boolean
  className?: string
}) {
  const { user } = useCurrentUser()
  const chat = useBroadcastChat(broadcast.id)
  const ads = useBroadcastAds(broadcast.id, broadcast.kind)
  const live = broadcast.status === "live"
  const pinned = chat.pinned ?? broadcast.pinned_message

  const moderate = async (id: string, action: "pin" | "unpin" | "delete") => {
    try {
      await chat.moderate(id, action)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "처리하지 못했어요.")
    }
  }
  const mute = async (userId: string, nickname: string) => {
    if (!window.confirm(`${nickname} 님을 10분 동안 음소거할까요?`)) return
    try {
      await broadcastRepo.mute(broadcast.id, userId, 10)
      toast.success(`${nickname} 님을 10분 음소거했어요.`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "처리하지 못했어요.")
    }
  }

  return (
    <div className={"flex min-h-0 flex-1 flex-col " + (className ?? "")}>
      {pinned && (
        <div className="flex items-start gap-2 border-b bg-[#DC2F55]/[0.06] px-3 py-2">
          <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#DC2F55]" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-[#DC2F55]">
              {pinned.nickname ?? "진행자"} 고정
            </p>
            <p className="line-clamp-2 text-xs leading-snug">{pinned.content}</p>
          </div>
        </div>
      )}
      <ChatList
        messages={chat.messages}
        loading={chat.loading}
        hasOlder={chat.hasOlder}
        loadingOlder={chat.loadingOlder}
        onLoadOlder={() => void chat.loadOlder()}
        myUserId={user?.id ?? null}
        canModerate={isHost}
        onModerate={(id, a) => void moderate(id, a)}
        onMute={(uid, name) => void mute(uid, name)}
        inlineAd={
          ads.ads.chat_inline ? (
            <AdCard ad={ads.ads.chat_inline} variant="inline" onImpression={ads.impression} onClick={ads.click} />
          ) : undefined
        }
      />
      <div className="border-t px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {!live ? (
          <p className="rounded-xl bg-muted px-3 py-2.5 text-center text-xs text-muted-foreground">
            끝난 중계예요. 남긴 응원은 그대로 볼 수 있어요.
          </p>
        ) : !user ? (
          <LoginPrompt />
        ) : (
          <ChatComposer
            onSend={(t) => chat.post(t)}
            posting={chat.posting}
            cooldownUntil={chat.cooldownUntil}
            disabled={!broadcast.chat_enabled && !isHost}
            disabledText="진행자가 채팅을 잠시 닫았어요"
          />
        )}
      </div>
    </div>
  )
}
