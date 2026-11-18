/**
 * 라이브 중계(broadcast) — 관전 채팅·라디오·후원·광고가 매달리는 방송 단위.
 * 서버 RPC(public_broadcast_by_key 등)가 주는 jsonb 모양 그대로. 마이그레이션 20261119000001_broadcasts_core.sql
 */

export type BroadcastKind = "tracker_event" | "hiking_session"
export type BroadcastStatus = "live" | "ended" | "archived"
export type BroadcastMessageKind = "text" | "voice" | "system" | "sponsor"

export interface BroadcastMessage {
  id: string
  broadcast_id: string
  kind: BroadcastMessageKind
  user_id: string | null
  /** 작성 시점 스냅샷 */
  nickname: string | null
  avatar_url: string | null
  content: string
  audio_url: string | null
  audio_duration_ms: number | null
  /** 진행자(호스트·관리자) 글 — 강조 표시 */
  is_host: boolean
  pinned: boolean
  sponsorship_id: string | null
  deleted_at: string | null
  created_at: string
}

export interface BroadcastHost {
  user_id: string
  nickname: string | null
  avatar_url: string | null
}

export interface PublicBroadcast {
  id: string
  kind: BroadcastKind
  /** tracker_events.id 또는 hiking_sessions.id */
  ref_id: string
  slug: string | null
  title: string
  intro: string | null
  status: BroadcastStatus
  chat_enabled: boolean
  radio_enabled: boolean
  sponsor_enabled: boolean
  radio_live: boolean
  livekit_room_name: string
  sponsor_total: number
  sponsor_count: number
  started_at: string
  ended_at: string | null
  host: BroadcastHost | null
  trail_id: string | null
  /** 트래커 이벤트면 관전 토큰 — /live/<slug> 는 /watch/<token> 으로 보낸다 */
  public_token: string | null
  pinned_message: BroadcastMessage | null
  /** 시스템 메시지 제외 */
  message_count: number
}

export type ModerateAction = "pin" | "unpin" | "delete"

export function parseBroadcastMessage(raw: unknown): BroadcastMessage {
  const r = (raw ?? {}) as Record<string, unknown>
  return {
    id: String(r.id),
    broadcast_id: String(r.broadcast_id),
    kind: (r.kind as BroadcastMessageKind) ?? "text",
    user_id: (r.user_id as string | null) ?? null,
    nickname: (r.nickname as string | null) ?? null,
    avatar_url: (r.avatar_url as string | null) ?? null,
    content: String(r.content ?? ""),
    audio_url: (r.audio_url as string | null) ?? null,
    audio_duration_ms: r.audio_duration_ms == null ? null : Number(r.audio_duration_ms),
    is_host: Boolean(r.is_host),
    pinned: Boolean(r.pinned),
    sponsorship_id: (r.sponsorship_id as string | null) ?? null,
    deleted_at: (r.deleted_at as string | null) ?? null,
    created_at: String(r.created_at ?? ""),
  }
}

export function parsePublicBroadcast(raw: unknown): PublicBroadcast | null {
  if (!raw || typeof raw !== "object") return null
  const r = raw as Record<string, unknown>
  if (!r.id) return null
  return {
    id: String(r.id),
    kind: (r.kind as BroadcastKind) ?? "hiking_session",
    ref_id: String(r.ref_id),
    slug: (r.slug as string | null) ?? null,
    title: String(r.title ?? ""),
    intro: (r.intro as string | null) ?? null,
    status: (r.status as BroadcastStatus) ?? "live",
    chat_enabled: r.chat_enabled !== false,
    radio_enabled: Boolean(r.radio_enabled),
    sponsor_enabled: Boolean(r.sponsor_enabled),
    radio_live: Boolean(r.radio_live),
    livekit_room_name: String(r.livekit_room_name ?? ""),
    sponsor_total: Number(r.sponsor_total ?? 0),
    sponsor_count: Number(r.sponsor_count ?? 0),
    started_at: String(r.started_at ?? ""),
    ended_at: (r.ended_at as string | null) ?? null,
    host: (r.host as BroadcastHost | null) ?? null,
    trail_id: (r.trail_id as string | null) ?? null,
    public_token: (r.public_token as string | null) ?? null,
    pinned_message: r.pinned_message ? parseBroadcastMessage(r.pinned_message) : null,
    message_count: Number(r.message_count ?? 0),
  }
}
