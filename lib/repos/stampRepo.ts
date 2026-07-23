/**
 * 스탬프지도 생성/수정 + 포인트 (hilly_rn stampRepo.ts 웹 포트)
 */
import { getSupabase } from "@/lib/supabase/client"
import { generateAndStoreTrailThumbnail } from "./trailThumbnail"
import { parseQuizChoices, toNumberOrNull } from "./trailTypes"

export interface StampPoint {
  id: string
  trail_id: string
  /** "icon|한글이름" 형식 — lib/stamp-pool.ts 코덱 사용 */
  title: string
  hint: string | null
  lng: number
  lat: number
  sort_order: number
  /** GPS 도착 반경(m). NULL = 앱 기본 10m */
  radius_m: number | null
  quiz_question: string | null
  quiz_choices: string[] | null
  quiz_answer_index: number | null
}

export interface StampPointDraft {
  id: string
  title: string
  hint: string | null
  lng: number
  lat: number
  radius_m?: number | null
  quiz_question?: string | null
  quiz_choices?: string[] | null
  quiz_answer_index?: number | null
}

const SP_SELECT =
  "id, trail_id, title, hint, lng, lat, sort_order, radius_m, quiz_question, quiz_choices, quiz_answer_index"

function parseStampPointRow(row: Record<string, unknown>): StampPoint {
  return {
    id: String(row.id ?? ""),
    trail_id: String(row.trail_id ?? ""),
    title: String(row.title ?? ""),
    hint: typeof row.hint === "string" ? row.hint : null,
    lng: Number(row.lng),
    lat: Number(row.lat),
    sort_order: toNumberOrNull(row.sort_order) ?? 0,
    radius_m: toNumberOrNull(row.radius_m),
    quiz_question:
      typeof row.quiz_question === "string" ? row.quiz_question : null,
    quiz_choices: parseQuizChoices(row.quiz_choices),
    quiz_answer_index: toNumberOrNull(row.quiz_answer_index),
  }
}

function draftToRow(p: StampPointDraft, trailId: string, sortOrder: number) {
  return {
    id: p.id,
    trail_id: trailId,
    title: p.title,
    hint: p.hint ?? null,
    lng: p.lng,
    lat: p.lat,
    sort_order: sortOrder,
    radius_m: p.radius_m ?? null,
    quiz_question: p.quiz_question ?? null,
    quiz_choices: p.quiz_choices ?? null,
    quiz_answer_index: p.quiz_answer_index ?? null,
  }
}

export const stampRepo = {
  /** 스탬프 지도 생성 (trail + stamp_points) — 반환: trailId */
  async createStampMap(params: {
    name: string
    stamp_order_mode: "ordered" | "free" | "random"
    created_by: string
    series_name?: string | null
    points: StampPointDraft[]
  }): Promise<string> {
    const supabase = getSupabase()
    const trailId = crypto.randomUUID()

    const lngs = params.points.map((p) => p.lng)
    const lats = params.points.map((p) => p.lat)
    const hasPoints = params.points.length > 0

    const { error: trailError } = await supabase.from("trails").insert({
      id: trailId,
      name: params.name,
      map_type: "stamp",
      stamp_order_mode: params.stamp_order_mode,
      created_by: params.created_by,
      source: "upload",
      series_name: params.series_name?.trim() || null,
      center: hasPoints
        ? [
            (Math.min(...lngs) + Math.max(...lngs)) / 2,
            (Math.min(...lats) + Math.max(...lats)) / 2,
          ]
        : null,
      bounds: hasPoints
        ? {
            minLon: Math.min(...lngs),
            maxLon: Math.max(...lngs),
            minLat: Math.min(...lats),
            maxLat: Math.max(...lats),
          }
        : null,
      sort_order: 9999,
    })
    if (trailError) throw new Error(trailError.message)

    if (hasPoints) {
      const rows = params.points.map((p, i) => draftToRow(p, trailId, i))
      const { error: pointsError } = await supabase
        .from("stamp_points")
        .insert(rows)
      if (pointsError) throw new Error(pointsError.message)
      generateAndStoreTrailThumbnail(trailId).catch(() => {})
    }

    return trailId
  },

  async listPoints(trailId: string): Promise<StampPoint[]> {
    const { data, error } = await getSupabase()
      .from("stamp_points")
      .select(SP_SELECT)
      .eq("trail_id", trailId)
      .order("sort_order", { ascending: true })
    if (error) throw new Error(error.message)
    return (data ?? []).map((r) =>
      parseStampPointRow(r as Record<string, unknown>),
    )
  },

  /** 스탬프 지도 수정 (trail 메타 + stamp_points 전체 동기화) */
  async updateStampMap(
    trailId: string,
    params: {
      name: string
      stamp_order_mode: "ordered" | "free" | "random"
      series_name?: string | null
      points: StampPointDraft[]
    },
  ): Promise<void> {
    const supabase = getSupabase()
    const lngs = params.points.map((p) => p.lng)
    const lats = params.points.map((p) => p.lat)
    const hasPoints = params.points.length > 0

    const { error: trailError } = await supabase
      .from("trails")
      .update({
        name: params.name,
        stamp_order_mode: params.stamp_order_mode,
        series_name: params.series_name?.trim() || null,
        center: hasPoints
          ? [
              (Math.min(...lngs) + Math.max(...lngs)) / 2,
              (Math.min(...lats) + Math.max(...lats)) / 2,
            ]
          : null,
        bounds: hasPoints
          ? {
              minLon: Math.min(...lngs),
              maxLon: Math.max(...lngs),
              minLat: Math.min(...lats),
              maxLat: Math.max(...lats),
            }
          : null,
      })
      .eq("id", trailId)
    if (trailError) throw new Error(trailError.message)

    const { data: existingRows } = await supabase
      .from("stamp_points")
      .select("id")
      .eq("trail_id", trailId)
    const existingIds = new Set(
      (existingRows ?? []).map((r: { id: string }) => r.id),
    )
    const newIds = new Set(params.points.map((p) => p.id))

    const toDelete = [...existingIds].filter((id) => !newIds.has(id))
    if (toDelete.length > 0) {
      await supabase.from("stamp_points").delete().in("id", toDelete)
    }

    if (hasPoints) {
      const rows = params.points.map((p, i) => draftToRow(p, trailId, i))
      const { error } = await supabase
        .from("stamp_points")
        .upsert(rows, { onConflict: "id" })
      if (error) throw new Error(error.message)
      generateAndStoreTrailThumbnail(trailId).catch(() => {})
    }
  },
}
