/**
 * 트레일 조회/메타 수정/삭제 (hilly_rn trailQueries + trailUpload 일부 웹 포트)
 */
import { getSupabase } from "@/lib/supabase/client"
import {
  type ActivityType,
  type Trail,
  CHECKPOINTS_TABLE,
  CHECKPOINT_PHOTOS_TABLE,
  TRAILS_TABLE,
  parseTrailRow,
} from "./trailTypes"

const TRAIL_SELECT =
  "id, name, day, gpx_storage_bucket, gpx_storage_path, distance_km, total_ascent_m, bounds, center, coordinates, sort_order, created_by, source, map_type, stamp_order_mode, activity_types, series_name, course_summary, thumbnail_path, start_lat, start_lng, end_lat, end_lng"

export const trailRepo = {
  /** 내가 만든 지도 목록 (최신 생성 순) */
  async listMyTrails(userId: string): Promise<Trail[]> {
    const { data, error } = await getSupabase()
      .from(TRAILS_TABLE)
      .select(TRAIL_SELECT)
      .eq("created_by", userId)
      .eq("source", "upload")
      .order("created_at", { ascending: false })
    if (error) throw error
    return (data ?? []).map((r) => parseTrailRow(r as Record<string, unknown>))
  },

  async getTrailById(trailId: string): Promise<Trail | null> {
    const { data, error } = await getSupabase()
      .from(TRAILS_TABLE)
      .select(TRAIL_SELECT)
      .eq("id", trailId)
      .maybeSingle()
    if (error) throw error
    return data ? parseTrailRow(data as Record<string, unknown>) : null
  },

  /** 제목/시리즈/요약/활동유형 부분 업데이트. undefined 필드는 그대로 둠. */
  async updateTrailMeta(
    trailId: string,
    params: {
      name?: string
      series_name?: string | null
      course_summary?: string | null
      activity_types?: ActivityType[]
    },
  ): Promise<void> {
    const update: Record<string, unknown> = {}
    if (params.name !== undefined) update.name = params.name
    if (params.series_name !== undefined)
      update.series_name = params.series_name
    if (params.course_summary !== undefined)
      update.course_summary = params.course_summary
    if (params.activity_types !== undefined)
      update.activity_types = params.activity_types
    if (Object.keys(update).length === 0) return
    const { error } = await getSupabase()
      .from(TRAILS_TABLE)
      .update(update)
      .eq("id", trailId)
    if (error) throw error
  },

  /** 업로드한 지도 삭제 — 체크포인트 사진/GPX/썸네일 스토리지까지 정리 */
  async deleteUploadedTrail(trailId: string, userId: string): Promise<void> {
    const supabase = getSupabase()
    const trail = await this.getTrailById(trailId)
    if (!trail || trail.created_by !== userId) {
      throw new Error("삭제할 권한이 없어요.")
    }
    if (trail.source !== "upload") {
      throw new Error("업로드한 지도만 삭제할 수 있습니다.")
    }

    const { data: cpList, error: cpErr } = await supabase
      .from(CHECKPOINTS_TABLE)
      .select("id")
      .eq("trail_id", trailId)
    if (cpErr) throw cpErr

    const cpIds = (cpList ?? []).map((r: { id: string }) => r.id)
    if (cpIds.length > 0) {
      const { data: photoRows, error: phErr } = await supabase
        .from(CHECKPOINT_PHOTOS_TABLE)
        .select("storage_bucket, storage_path")
        .in("checkpoint_id", cpIds)
      if (phErr) throw phErr
      for (const p of photoRows ?? []) {
        const bucket = String(
          (p as { storage_bucket: string }).storage_bucket ?? "",
        )
        const path = String((p as { storage_path: string }).storage_path ?? "")
        if (bucket && path) {
          const { error: rm } = await supabase.storage
            .from(bucket)
            .remove([path])
          if (rm) throw rm
        }
      }
    }

    if (trail.gpx_storage_path && trail.gpx_storage_bucket) {
      const { error: gpxRm } = await supabase.storage
        .from(trail.gpx_storage_bucket)
        .remove([trail.gpx_storage_path])
      if (gpxRm) throw gpxRm
    }

    const { error: delErr } = await supabase
      .from(TRAILS_TABLE)
      .delete()
      .eq("id", trailId)
    if (delErr) throw delErr

    if (trail.thumbnail_path) {
      supabase.storage
        .from("trail-thumbnails")
        .remove([trail.thumbnail_path])
        .catch(() => {})
    }
  },
}
