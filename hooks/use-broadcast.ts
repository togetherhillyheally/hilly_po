"use client"

// 방송 정보 — 한 번 읽고, 'broadcast:{id}' 토픽의 state 이벤트(상태·플래그·핀·후원 합계)로 갱신. 60초마다 다시 읽어 놓친 것 보정
import { useCallback, useEffect, useRef, useState } from "react"
import { subscribeBroadcast } from "@/lib/broadcast-channel"
import { broadcastRepo } from "@/lib/repos/broadcastRepo"
import {
  type BroadcastKind,
  type PublicBroadcast,
  parsePublicBroadcast,
} from "@/lib/repos/broadcastTypes"

const REFRESH_MS = 60_000

export type BroadcastLookup =
  | { key: string }
  | { kind: BroadcastKind; refId: string }
  | null

export function useBroadcast(lookup: BroadcastLookup) {
  const [broadcast, setBroadcast] = useState<PublicBroadcast | null>(null)
  const [loading, setLoading] = useState(!!lookup)
  const [notFound, setNotFound] = useState(false)
  const lookupKey = lookup
    ? "key" in lookup
      ? `key:${lookup.key}`
      : `ref:${lookup.kind}:${lookup.refId}`
    : ""
  const lookupRef = useRef(lookup)
  lookupRef.current = lookup

  const load = useCallback(async () => {
    const l = lookupRef.current
    if (!l) {
      setBroadcast(null)
      setLoading(false)
      return
    }
    try {
      const b = "key" in l ? await broadcastRepo.byKey(l.key) : await broadcastRepo.byRef(l.kind, l.refId)
      setBroadcast(b)
      setNotFound(!b)
    } catch {
      // 일시 오류 — 이전 값 유지, 다음 주기에 재시도
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setLoading(!!lookupRef.current)
    setNotFound(false)
    void load()
    if (!lookupKey) return
    const t = setInterval(() => void load(), REFRESH_MS)
    return () => clearInterval(t)
  }, [lookupKey, load])

  // 상태 이벤트 구독 — id 가 정해진 뒤
  const id = broadcast?.id ?? null
  useEffect(() => {
    if (!id) return
    return subscribeBroadcast(id, "state", (payload) => {
      const next = parsePublicBroadcast(payload)
      if (next) setBroadcast(next)
    })
  }, [id])

  /** 운영 RPC 응답으로 바로 반영 (state 이벤트가 오기 전에도 화면이 맞게) */
  const apply = useCallback((b: PublicBroadcast | null) => {
    if (b) setBroadcast(b)
  }, [])

  return { broadcast, loading, notFound, reload: load, apply }
}
