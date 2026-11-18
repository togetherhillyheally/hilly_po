// 'broadcast:{id}' 토픽 하나를 여러 훅(방송 상태·채팅)이 같이 쓴다.
// supabase-js 는 같은 토픽을 두 번 열면 충돌하므로 방송마다 채널 하나를 참조 카운트로 들고 리스너만 나눠 준다.
import type { RealtimeChannel } from "@supabase/supabase-js"
import { getSupabase } from "@/lib/supabase/client"

type Event = "message" | "state"
type Listener = (payload: unknown) => void

const entries = new Map<
  string,
  { channel: RealtimeChannel; refs: number; listeners: Record<Event, Set<Listener>> }
>()

export function subscribeBroadcast(broadcastId: string, event: Event, listener: Listener): () => void {
  let entry = entries.get(broadcastId)
  if (!entry) {
    const listeners: Record<Event, Set<Listener>> = { message: new Set(), state: new Set() }
    const channel = getSupabase()
      .channel(`broadcast:${broadcastId}`)
      .on("broadcast", { event: "message" }, ({ payload }) => {
        listeners.message.forEach((fn) => fn(payload))
      })
      .on("broadcast", { event: "state" }, ({ payload }) => {
        listeners.state.forEach((fn) => fn(payload))
      })
      .subscribe()
    entry = { channel, refs: 0, listeners }
    entries.set(broadcastId, entry)
  }
  entry.refs += 1
  entry.listeners[event].add(listener)
  return () => {
    const e = entries.get(broadcastId)
    if (!e) return
    e.listeners[event].delete(listener)
    e.refs -= 1
    if (e.refs <= 0) {
      entries.delete(broadcastId)
      void getSupabase().removeChannel(e.channel)
    }
  }
}
