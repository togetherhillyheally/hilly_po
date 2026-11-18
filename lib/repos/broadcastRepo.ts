/**
 * 라이브 중계 RPC — 테이블은 닫혀 있고 전부 SECURITY DEFINER RPC 경유.
 * 읽기(public_*)는 로그인 없이, 쓰기(broadcast_*)는 로그인 필요 (서버가 거절하면 한글 메시지가 온다).
 */
import { getSupabase } from "@/lib/supabase/client"
import {
  type BroadcastKind,
  type BroadcastMessage,
  type ModerateAction,
  type PublicBroadcast,
  parseBroadcastMessage,
  parsePublicBroadcast,
} from "./broadcastTypes"

/** 서버 RAISE 메시지를 그대로 쓰기 위해 Error 로 감싼다 */
function fail(error: { message: string } | null, fallback: string): never {
  throw new Error(error?.message || fallback)
}

export const broadcastRepo = {
  /** /live/<slug 또는 uuid> */
  async byKey(key: string): Promise<PublicBroadcast | null> {
    const { data, error } = await getSupabase().rpc("public_broadcast_by_key", { p_key: key })
    if (error) throw error
    return parsePublicBroadcast(data)
  },

  /** 이벤트 id / 세션 id 로 — 방송이 없으면 null (패널을 안 그린다) */
  async byRef(kind: BroadcastKind, refId: string): Promise<PublicBroadcast | null> {
    const { data, error } = await getSupabase().rpc("public_broadcast_by_ref", {
      p_kind: kind,
      p_ref_id: refId,
    })
    if (error) throw error
    return parsePublicBroadcast(data)
  },

  /** 최신순 최대 100개 — 화면에선 뒤집어 오래된 것부터 */
  async messages(broadcastId: string, before?: string | null, limit = 50): Promise<BroadcastMessage[]> {
    const { data, error } = await getSupabase().rpc("public_broadcast_messages", {
      p_broadcast_id: broadcastId,
      p_before: before ?? null,
      p_limit: limit,
    })
    if (error) throw error
    return ((data ?? []) as unknown[]).map(parseBroadcastMessage)
  },

  async post(
    broadcastId: string,
    content: string,
    audio?: { url: string; durationMs: number } | null,
  ): Promise<string> {
    const { data, error } = await getSupabase().rpc("broadcast_post_message", {
      p_broadcast_id: broadcastId,
      p_content: content,
      p_audio_url: audio?.url ?? null,
      p_audio_duration_ms: audio?.durationMs ?? null,
    })
    if (error) fail(error, "메시지를 보내지 못했어요.")
    return data as string
  },

  async moderate(messageId: string, action: ModerateAction): Promise<void> {
    const { error } = await getSupabase().rpc("broadcast_moderate_message", {
      p_message_id: messageId,
      p_action: action,
    })
    if (error) fail(error, "처리하지 못했어요.")
  },

  /** minutes 0 이면 해제 */
  async mute(broadcastId: string, userId: string, minutes: number, reason?: string): Promise<void> {
    const { error } = await getSupabase().rpc("broadcast_mute_user", {
      p_broadcast_id: broadcastId,
      p_user_id: userId,
      p_minutes: minutes,
      p_reason: reason ?? null,
    })
    if (error) fail(error, "처리하지 못했어요.")
  },

  async updateSettings(
    broadcastId: string,
    patch: Partial<Pick<PublicBroadcast, "title" | "intro" | "chat_enabled" | "radio_enabled" | "sponsor_enabled">>,
  ): Promise<PublicBroadcast | null> {
    const { data, error } = await getSupabase().rpc("broadcast_update_settings", {
      p_broadcast_id: broadcastId,
      p_patch: patch,
    })
    if (error) fail(error, "저장하지 못했어요.")
    return parsePublicBroadcast(data)
  },

  async setStatus(broadcastId: string, status: "live" | "ended"): Promise<PublicBroadcast | null> {
    const { data, error } = await getSupabase().rpc("broadcast_set_status", {
      p_broadcast_id: broadcastId,
      p_status: status,
    })
    if (error) fail(error, "상태를 바꾸지 못했어요.")
    return parsePublicBroadcast(data)
  },

  /** 관리자 — 트래커 이벤트에 방송(채팅) 켜기. 이미 있으면 그대로 돌려준다 */
  async adminEnsureForEvent(eventId: string): Promise<PublicBroadcast | null> {
    const { data, error } = await getSupabase().rpc("admin_broadcast_ensure_for_event", {
      p_event_id: eventId,
    })
    if (error) fail(error, "중계를 켜지 못했어요.")
    return parsePublicBroadcast(data)
  },
}
