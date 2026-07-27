/**
 * 체크포인트 CRUD + 사진 (hilly_rn checkpointRepo.ts 웹 포트 — 오너 편집 전용)
 */
import {
  MAX_PHOTOS_PER_CHECKPOINT,
  TRAIL_CHECKPOINT_PHOTOS_BUCKET,
  DEFAULT_MARKER_ICON,
} from "@/lib/checkpoint-constants"
import { getSupabase } from "@/lib/supabase/client"
import {
  type TrailCheckpoint,
  type TrailCheckpointPhoto,
  CHECKPOINTS_TABLE,
  CHECKPOINT_PHOTOS_TABLE,
  parseQuizChoices,
  toNumberOrNull,
} from "./trailTypes"

const CP_SELECT =
  "id, trail_id, sort_order, title, lng, lat, note, marker_icon, created_by, radius_m, quiz_question, quiz_choices, quiz_answer_index"

export interface CheckpointReview {
  id: string
  checkpoint_id: string
  author_id: string
  body: string
  rating: number | null
  created_at: string
  author_nickname: string | null
  author_avatar_url: string | null
}

export interface CheckpointSeed {
  checkpoint_id: string
  giver_id: string
}

function parseCheckpointRow(row: Record<string, unknown>): TrailCheckpoint {
  return {
    id: String(row.id ?? ""),
    trail_id: String(row.trail_id ?? ""),
    sort_order: toNumberOrNull(row.sort_order) ?? 0,
    title: String(row.title ?? ""),
    lng: Number(row.lng),
    lat: Number(row.lat),
    note: typeof row.note === "string" ? row.note : null,
    marker_icon:
      typeof row.marker_icon === "string" ? row.marker_icon : DEFAULT_MARKER_ICON,
    created_by: typeof row.created_by === "string" ? row.created_by : null,
    radius_m: toNumberOrNull(row.radius_m),
    quiz_question:
      typeof row.quiz_question === "string" ? row.quiz_question : null,
    quiz_choices: parseQuizChoices(row.quiz_choices),
    quiz_answer_index: toNumberOrNull(row.quiz_answer_index),
  }
}

export interface CheckpointUpdate {
  title?: string
  note?: string | null
  marker_icon?: string | null
  lng?: number
  lat?: number
  radius_m?: number | null
  quiz_question?: string | null
  quiz_choices?: string[] | null
  quiz_answer_index?: number | null
}

export const checkpointRepo = {
  async listCheckpoints(trailId: string): Promise<TrailCheckpoint[]> {
    const { data, error } = await getSupabase()
      .from(CHECKPOINTS_TABLE)
      .select(CP_SELECT)
      .eq("trail_id", trailId)
      .order("sort_order", { ascending: true })
    if (error) throw error
    return (data ?? []).map((r) =>
      parseCheckpointRow(r as Record<string, unknown>),
    )
  },

  async createCheckpoint(params: {
    trailId: string
    userId: string
    title: string
    lng: number
    lat: number
    note?: string | null
    marker_icon?: string | null
  }): Promise<TrailCheckpoint> {
    const supabase = getSupabase()
    const { data: maxRow } = await supabase
      .from(CHECKPOINTS_TABLE)
      .select("sort_order")
      .eq("trail_id", params.trailId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle()
    const sortOrder =
      ((maxRow as { sort_order: number } | null)?.sort_order ?? -1) + 1

    const { data, error } = await supabase
      .from(CHECKPOINTS_TABLE)
      .insert({
        id: crypto.randomUUID(),
        trail_id: params.trailId,
        sort_order: sortOrder,
        title: params.title,
        lng: params.lng,
        lat: params.lat,
        note: params.note ?? null,
        marker_icon: params.marker_icon ?? DEFAULT_MARKER_ICON,
        created_by: params.userId,
      })
      .select(CP_SELECT)
      .single()
    if (error) throw error
    return parseCheckpointRow(data as Record<string, unknown>)
  },

  async updateCheckpoint(
    checkpointId: string,
    update: CheckpointUpdate,
  ): Promise<void> {
    const payload: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(update)) {
      if (v !== undefined) payload[k] = v
    }
    if (Object.keys(payload).length === 0) return
    const { error } = await getSupabase()
      .from(CHECKPOINTS_TABLE)
      .update(payload)
      .eq("id", checkpointId)
    if (error) throw error
  },

  async deleteCheckpointById(checkpointId: string): Promise<void> {
    // 사진 스토리지 정리 후 행 삭제
    const supabase = getSupabase()
    const { data: photoRows } = await supabase
      .from(CHECKPOINT_PHOTOS_TABLE)
      .select("storage_bucket, storage_path")
      .eq("checkpoint_id", checkpointId)
    for (const p of photoRows ?? []) {
      const bucket = String(
        (p as { storage_bucket: string }).storage_bucket ?? "",
      )
      const path = String((p as { storage_path: string }).storage_path ?? "")
      if (bucket && path) {
        await supabase.storage.from(bucket).remove([path])
      }
    }
    const { error } = await supabase
      .from(CHECKPOINTS_TABLE)
      .delete()
      .eq("id", checkpointId)
    if (error) throw error
  },

  /** 목록 순서 재배치 — ids 를 원하는 순서로 전달 */
  async reorderCheckpoints(trailId: string, ids: string[]): Promise<void> {
    const supabase = getSupabase()
    for (let i = 0; i < ids.length; i++) {
      const { error } = await supabase
        .from(CHECKPOINTS_TABLE)
        .update({ sort_order: i })
        .eq("id", ids[i])
        .eq("trail_id", trailId)
      if (error) throw error
    }
  },

  // ── 댓글/좋아요(씨앗) 조회 (오너 확인용 읽기 전용) ──

  /** 트레일 전체 체크포인트 댓글 — 최신순. 작성자 프로필 join. */
  async listCheckpointReviewsForTrail(
    trailId: string,
  ): Promise<CheckpointReview[]> {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from("trail_checkpoint_reviews")
      .select(
        "id, checkpoint_id, author_id, body, rating, created_at, trail_checkpoints!inner(trail_id)",
      )
      .eq("trail_checkpoints.trail_id", trailId)
      .order("created_at", { ascending: false })
    if (error) throw error

    const rows = (data ?? []) as unknown as (Omit<
      CheckpointReview,
      "author_nickname" | "author_avatar_url"
    > & { trail_checkpoints: unknown })[]
    if (rows.length === 0) return []

    const authorIds = [...new Set(rows.map((r) => r.author_id))]
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, nickname, avatar_url")
      .in("id", authorIds)
    const profileMap = new Map<
      string,
      { nickname: string; avatar_url: string | null }
    >()
    for (const p of (profiles ?? []) as {
      id: string
      nickname: string
      avatar_url: string | null
    }[]) {
      profileMap.set(p.id, { nickname: p.nickname, avatar_url: p.avatar_url })
    }

    return rows.map((r) => ({
      id: r.id,
      checkpoint_id: r.checkpoint_id,
      author_id: r.author_id,
      body: r.body,
      rating: r.rating,
      created_at: r.created_at,
      author_nickname: profileMap.get(r.author_id)?.nickname ?? null,
      author_avatar_url: profileMap.get(r.author_id)?.avatar_url ?? null,
    }))
  },

  /** 트레일 전체 체크포인트 좋아요(씨앗) — checkpoint_id 로 그룹핑해 사용 */
  async listCheckpointSeedsForTrail(trailId: string): Promise<CheckpointSeed[]> {
    const { data, error } = await getSupabase()
      .from("trail_checkpoint_seeds")
      .select("checkpoint_id, giver_id, trail_checkpoints!inner(trail_id)")
      .eq("trail_checkpoints.trail_id", trailId)
    if (error) throw error
    return (data ?? []).map((r) => ({
      checkpoint_id: (r as { checkpoint_id: string }).checkpoint_id,
      giver_id: (r as { giver_id: string }).giver_id,
    }))
  },

  // ── 사진 ──

  /** 트레일 전체 체크포인트 사진 — 블로그형 보기용. checkpoint_id 로 그룹핑해 사용 */
  async listCheckpointPhotosForTrail(
    trailId: string,
  ): Promise<TrailCheckpointPhoto[]> {
    const { data, error } = await getSupabase()
      .from(CHECKPOINT_PHOTOS_TABLE)
      .select(
        "id, checkpoint_id, author_id, storage_bucket, storage_path, created_at, trail_checkpoints!inner(trail_id)",
      )
      .eq("trail_checkpoints.trail_id", trailId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
    if (error) throw error
    return (data ?? []).map((r) => {
      const row = r as unknown as TrailCheckpointPhoto
      return {
        id: row.id,
        checkpoint_id: row.checkpoint_id,
        author_id: row.author_id,
        storage_bucket: row.storage_bucket,
        storage_path: row.storage_path,
        created_at: row.created_at,
      }
    })
  },

  async listCheckpointPhotos(
    checkpointId: string,
  ): Promise<TrailCheckpointPhoto[]> {
    const { data, error } = await getSupabase()
      .from(CHECKPOINT_PHOTOS_TABLE)
      .select(
        "id, checkpoint_id, author_id, storage_bucket, storage_path, created_at",
      )
      .eq("checkpoint_id", checkpointId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
    if (error) throw error
    return (data ?? []) as TrailCheckpointPhoto[]
  },

  async uploadCheckpointPhoto(params: {
    userId: string
    checkpointId: string
    blob: Blob
    fileSize?: number | null
    takenAt?: string | null
  }): Promise<TrailCheckpointPhoto> {
    const supabase = getSupabase()
    const { userId, checkpointId, blob, fileSize, takenAt } = params
    const { count, error: cntErr } = await supabase
      .from(CHECKPOINT_PHOTOS_TABLE)
      .select("id", { count: "exact", head: true })
      .eq("checkpoint_id", checkpointId)
    if (cntErr) throw cntErr
    if ((count ?? 0) >= MAX_PHOTOS_PER_CHECKPOINT) {
      throw new Error(
        `사진은 체크포인트당 최대 ${MAX_PHOTOS_PER_CHECKPOINT}장까지 등록할 수 있습니다.`,
      )
    }
    const nextSortOrder = count ?? 0

    const photoId = crypto.randomUUID()
    // 스토리지 정책: 경로 첫 세그먼트가 본인 uid 여야 함
    const storagePath = `${userId}/${checkpointId}/${photoId}.jpg`

    const { error: upErr } = await supabase.storage
      .from(TRAIL_CHECKPOINT_PHOTOS_BUCKET)
      .upload(storagePath, blob, {
        contentType: "image/jpeg",
        upsert: false,
      })
    if (upErr) throw upErr

    const { data, error: insErr } = await supabase
      .from(CHECKPOINT_PHOTOS_TABLE)
      .insert({
        checkpoint_id: checkpointId,
        author_id: userId,
        storage_bucket: TRAIL_CHECKPOINT_PHOTOS_BUCKET,
        storage_path: storagePath,
        sort_order: nextSortOrder,
        file_size_bytes: fileSize ?? blob.size,
        taken_at: takenAt ?? null,
      })
      .select(
        "id, checkpoint_id, author_id, storage_bucket, storage_path, created_at",
      )
      .single()

    if (insErr) {
      await supabase.storage
        .from(TRAIL_CHECKPOINT_PHOTOS_BUCKET)
        .remove([storagePath])
      throw insErr
    }

    return data as TrailCheckpointPhoto
  },

  async deleteCheckpointPhoto(photoId: string, userId: string): Promise<void> {
    const supabase = getSupabase()
    const { data: row, error: fetchErr } = await supabase
      .from(CHECKPOINT_PHOTOS_TABLE)
      .select("id, author_id, storage_bucket, storage_path")
      .eq("id", photoId)
      .single()
    if (fetchErr) throw fetchErr
    if (!row || row.author_id !== userId) {
      throw new Error("삭제할 권한이 없어요.")
    }

    const { error: rmErr } = await supabase.storage
      .from(row.storage_bucket)
      .remove([row.storage_path])
    if (rmErr) throw rmErr

    const { error: delErr } = await supabase
      .from(CHECKPOINT_PHOTOS_TABLE)
      .delete()
      .eq("id", photoId)
    if (delErr) throw delErr
  },
}
