/**
 * 트레일 리뷰 조회 (hilly_rn trailReviews.ts 웹 포트 — 오너 확인용 읽기 전용)
 */
import { getSupabase } from "@/lib/supabase/client"

export interface TrailReview {
  id: string
  trail_id: string
  user_id: string
  rating: number | null
  body: string | null
  created_at: string
  author_nickname: string | null
  author_avatar_url: string | null
}

export interface TrailReviewAggregate {
  count: number
  average: number | null
  rated_count: number
}

const REVIEW_SELECT = "id, trail_id, user_id, rating, body, created_at"

export const trailReviewsRepo = {
  /** 특정 trail 의 리뷰 목록 (최신순). 작성자 프로필 join. */
  async listByTrail(trailId: string): Promise<TrailReview[]> {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from("trail_reviews")
      .select(REVIEW_SELECT)
      .eq("trail_id", trailId)
      .order("created_at", { ascending: false })
    if (error) throw error

    const rows = (data ?? []) as Omit<
      TrailReview,
      "author_nickname" | "author_avatar_url"
    >[]
    if (rows.length === 0) return []

    const userIds = [...new Set(rows.map((r) => r.user_id))]
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, nickname, avatar_url")
      .in("id", userIds)
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
      ...r,
      author_nickname: profileMap.get(r.user_id)?.nickname ?? null,
      author_avatar_url: profileMap.get(r.user_id)?.avatar_url ?? null,
    }))
  },

  /** 평균 별점 + 카운트 */
  async getAggregate(trailId: string): Promise<TrailReviewAggregate> {
    const { data, error } = await getSupabase()
      .from("trail_reviews")
      .select("rating")
      .eq("trail_id", trailId)
    if (error) throw error
    const rows = (data ?? []) as { rating: number | null }[]
    const count = rows.length
    const ratings = rows
      .map((r) => r.rating)
      .filter((r): r is number => r != null)
    const rated_count = ratings.length
    const average =
      rated_count > 0
        ? Math.round(
            (ratings.reduce((s, r) => s + r, 0) / rated_count) * 10,
          ) / 10
        : null
    return { count, average, rated_count }
  },
}
