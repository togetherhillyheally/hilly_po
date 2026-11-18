"use client"

// 관전 채팅 — 최근 50개 로드 + 'broadcast:{id}' 토픽 message 이벤트 병합(새 글·수정·삭제) + 15초 폴링 폴백.
// 쓰기는 RPC(로그인 필요). 서버가 2초 레이트리밋을 걸므로 화면도 같은 쿨다운을 보여준다.
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { subscribeBroadcast } from "@/lib/broadcast-channel"
import { broadcastRepo } from "@/lib/repos/broadcastRepo"
import {
  type BroadcastMessage,
  type ModerateAction,
  parseBroadcastMessage,
} from "@/lib/repos/broadcastTypes"

const PAGE = 50
const POLL_MS = 15_000
const COOLDOWN_MS = 2_000

function mergeMessages(prev: BroadcastMessage[], incoming: BroadcastMessage[]): BroadcastMessage[] {
  const map = new Map(prev.map((m) => [m.id, m]))
  for (const m of incoming) {
    if (m.deleted_at) map.delete(m.id)
    else map.set(m.id, m)
  }
  return Array.from(map.values()).sort((a, b) => a.created_at.localeCompare(b.created_at))
}

export function useBroadcastChat(broadcastId: string | null) {
  const [messages, setMessages] = useState<BroadcastMessage[]>([])
  const [loading, setLoading] = useState(!!broadcastId)
  const [hasOlder, setHasOlder] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [posting, setPosting] = useState(false)
  const [cooldownUntil, setCooldownUntil] = useState(0)
  const idRef = useRef(broadcastId)
  idRef.current = broadcastId

  const loadLatest = useCallback(async () => {
    const id = idRef.current
    if (!id) return
    try {
      const latest = await broadcastRepo.messages(id, null, PAGE)
      setMessages((prev) => {
        const merged = mergeMessages(prev, latest)
        // 서버에서 사라진(삭제된) 글은 폴링 때 걸러낸다 — 최신 50개 범위 안에서만
        if (latest.length > 0) {
          const oldest = latest[latest.length - 1].created_at
          const ids = new Set(latest.map((m) => m.id))
          return merged.filter((m) => m.created_at < oldest || ids.has(m.id))
        }
        return merged
      })
      if (messagesRef.current.length === 0) setHasOlder(latest.length >= PAGE)
    } catch {
      // 다음 주기에 재시도
    } finally {
      setLoading(false)
    }
  }, [])
  const messagesRef = useRef<BroadcastMessage[]>([])
  messagesRef.current = messages

  // 최초 로드 + 15초 폴링 (탭 숨김 시 중단)
  useEffect(() => {
    setMessages([])
    setLoading(!!broadcastId)
    setHasOlder(false)
    if (!broadcastId) return
    void loadLatest()
    const tick = () => {
      if (document.visibilityState === "hidden") return
      void loadLatest()
    }
    const t = setInterval(tick, POLL_MS)
    document.addEventListener("visibilitychange", tick)
    return () => {
      clearInterval(t)
      document.removeEventListener("visibilitychange", tick)
    }
  }, [broadcastId, loadLatest])

  // 실시간 — 새 글·수정(핀)·삭제가 같은 이벤트로 온다 (토픽은 use-broadcast 와 공유)
  useEffect(() => {
    if (!broadcastId) return
    return subscribeBroadcast(broadcastId, "message", (payload) => {
      const m = parseBroadcastMessage(payload)
      if (m.broadcast_id !== broadcastId) return
      setMessages((prev) => mergeMessages(prev, [m]))
    })
  }, [broadcastId])

  const loadOlder = useCallback(async () => {
    const id = idRef.current
    const oldest = messagesRef.current[0]
    if (!id || !oldest || loadingOlder) return
    setLoadingOlder(true)
    try {
      const older = await broadcastRepo.messages(id, oldest.created_at, PAGE)
      setMessages((prev) => mergeMessages(prev, older))
      setHasOlder(older.length >= PAGE)
    } catch {
      // 무시
    } finally {
      setLoadingOlder(false)
    }
  }, [loadingOlder])

  const post = useCallback(
    async (content: string, audio?: { url: string; durationMs: number } | null) => {
      const id = idRef.current
      if (!id) return
      const text = content.trim()
      if (!text && !audio) return
      setPosting(true)
      try {
        await broadcastRepo.post(id, text, audio ?? null)
        setCooldownUntil(Date.now() + COOLDOWN_MS)
      } finally {
        setPosting(false)
      }
    },
    [],
  )

  const moderate = useCallback(async (messageId: string, action: ModerateAction) => {
    await broadcastRepo.moderate(messageId, action)
    // 응답을 기다리지 않고 화면 먼저 — 실시간 이벤트가 곧 같은 결과를 준다
    setMessages((prev) =>
      action === "delete"
        ? prev.filter((m) => m.id !== messageId)
        : prev.map((m) =>
            action === "pin"
              ? { ...m, pinned: m.id === messageId }
              : m.id === messageId
                ? { ...m, pinned: false }
                : m,
          ),
    )
  }, [])

  const pinned = useMemo(() => messages.find((m) => m.pinned) ?? null, [messages])

  return {
    messages,
    pinned,
    loading,
    hasOlder,
    loadingOlder,
    loadOlder,
    post,
    posting,
    cooldownUntil,
    moderate,
    reload: loadLatest,
  }
}
