/**
 * GPX 업로드로 코스지도 생성 (hilly_rn trailUpload.ts 웹 포트)
 * insert 컬럼 구성은 라이브 RLS 로 검증된 hilly_rn 형태를 그대로 유지한다.
 */
import {
  displayNameFromFileName,
  prepareTrailFromGpxText,
  type PreparedTrailGeometry,
} from "@/lib/gpx-prep"
import { getSupabase } from "@/lib/supabase/client"
import { generateAndStoreTrailThumbnail } from "./trailThumbnail"
import {
  type ActivityType,
  type Trail,
  TRAIL_GPX_STORAGE_BUCKET,
  TRAILS_TABLE,
  parseTrailRow,
} from "./trailTypes"

const INSERT_SELECT =
  "id, name, day, gpx_storage_bucket, gpx_storage_path, distance_km, total_ascent_m, bounds, center, coordinates, sort_order, created_by, source, status, visibility, activity_types, series_name"

async function nextSortOrder(): Promise<number> {
  const { data, error } = await getSupabase()
    .from(TRAILS_TABLE)
    .select("sort_order")
    .not("created_by", "is", null)
    .order("sort_order", { ascending: false })
    .limit(1)
  if (error) throw error
  return ((data?.[0]?.sort_order as number | undefined) ?? 0) + 1
}

export const trailUploadOps = {
  async createTrailFromGpxUpload(params: {
    userId: string
    gpxText: string
    fileName: string
    displayNameOverride?: string
    activityTypes?: ActivityType[]
    seriesName?: string | null
    prepared?: PreparedTrailGeometry
  }): Promise<Trail> {
    const supabase = getSupabase()
    const {
      userId,
      gpxText,
      fileName,
      activityTypes = ["walking", "running"],
      seriesName,
    } = params
    const prep = params.prepared ?? prepareTrailFromGpxText(gpxText)
    const displayName =
      params.displayNameOverride?.trim() ||
      prep.nameFromGpx ||
      displayNameFromFileName(fileName)

    const trailId = crypto.randomUUID()
    const storagePath = `${userId}/${trailId}.gpx`

    const body = new TextEncoder().encode(gpxText)
    const { error: upErr } = await supabase.storage
      .from(TRAIL_GPX_STORAGE_BUCKET)
      .upload(storagePath, body, {
        contentType: "application/gpx+xml",
        upsert: true,
      })
    if (upErr) throw upErr

    const nextSort = await nextSortOrder()

    const { data: inserted, error: insErr } = await supabase
      .from(TRAILS_TABLE)
      .insert({
        id: trailId,
        name: displayName,
        day: null,
        gpx_storage_bucket: TRAIL_GPX_STORAGE_BUCKET,
        gpx_storage_path: storagePath,
        distance_km: prep.distanceKm,
        total_ascent_m: prep.totalAscentM,
        bounds: prep.bounds,
        center: prep.center,
        coordinates: prep.coordinates,
        sort_order: nextSort,
        created_by: userId,
        source: "upload",
        status: "draft",
        activity_types: activityTypes,
        series_name: seriesName?.trim() || null,
      })
      .select(INSERT_SELECT)
      .single()

    if (insErr) {
      await supabase.storage
        .from(TRAIL_GPX_STORAGE_BUCKET)
        .remove([storagePath])
      throw insErr
    }

    generateAndStoreTrailThumbnail(trailId).catch(() => {})

    return parseTrailRow(inserted as Record<string, unknown>)
  },

  async createTrailFromMultiGpxUpload(params: {
    userId: string
    entries: {
      gpxText: string
      fileName: string
      prepared?: PreparedTrailGeometry
    }[]
    displayName: string
    activityTypes?: ActivityType[]
    seriesName?: string | null
  }): Promise<Trail> {
    const supabase = getSupabase()
    const {
      userId,
      entries,
      displayName,
      activityTypes = ["walking", "running"],
      seriesName,
    } = params
    if (entries.length === 0) throw new Error("파일이 없어요.")
    if (entries.length === 1) {
      return this.createTrailFromGpxUpload({
        userId,
        gpxText: entries[0].gpxText,
        fileName: entries[0].fileName,
        displayNameOverride: displayName,
        activityTypes,
        seriesName,
        prepared: entries[0].prepared,
      })
    }

    const preps = entries.map(
      (e) => e.prepared ?? prepareTrailFromGpxText(e.gpxText),
    )

    const bounds = preps.reduce(
      (acc, p) => ({
        minLat: Math.min(acc.minLat, p.bounds.minLat),
        maxLat: Math.max(acc.maxLat, p.bounds.maxLat),
        minLon: Math.min(acc.minLon, p.bounds.minLon),
        maxLon: Math.max(acc.maxLon, p.bounds.maxLon),
      }),
      preps[0].bounds,
    )
    const center: [number, number] = [
      (bounds.minLon + bounds.maxLon) / 2,
      (bounds.minLat + bounds.maxLat) / 2,
    ]
    const totalDistanceKm =
      Math.round(preps.reduce((s, p) => s + p.distanceKm, 0) * 10) / 10
    const totalAscentM = Math.round(
      preps.reduce((s, p) => s + p.totalAscentM, 0),
    )
    // 각 prep 의 coordinates 는 LineString 또는 MultiLineString.
    // 합칠 때는 모든 segment 를 평탄화해서 LineString[] 으로 만든다.
    const multiCoordinates: ([number, number] | [number, number, number])[][] =
      preps.flatMap((p) => {
        const c = p.coordinates
        const isMulti =
          c.length > 0 &&
          Array.isArray(c[0]) &&
          (c[0] as unknown[]).length > 0 &&
          Array.isArray((c[0] as unknown[])[0])
        return isMulti
          ? (c as ([number, number] | [number, number, number])[][])
          : [c as ([number, number] | [number, number, number])[]]
      })

    const trailId = crypto.randomUUID()
    const storagePath = `${userId}/${trailId}.gpx`

    const body = new TextEncoder().encode(entries[0].gpxText)
    const { error: upErr } = await supabase.storage
      .from(TRAIL_GPX_STORAGE_BUCKET)
      .upload(storagePath, body, {
        contentType: "application/gpx+xml",
        upsert: true,
      })
    if (upErr) throw upErr

    const nextSort = await nextSortOrder()

    const { data: inserted, error: insErr } = await supabase
      .from(TRAILS_TABLE)
      .insert({
        id: trailId,
        name: displayName.trim(),
        day: null,
        gpx_storage_bucket: TRAIL_GPX_STORAGE_BUCKET,
        gpx_storage_path: storagePath,
        distance_km: totalDistanceKm,
        total_ascent_m: totalAscentM,
        bounds,
        center,
        coordinates: multiCoordinates,
        sort_order: nextSort,
        created_by: userId,
        source: "upload",
        status: "draft",
        activity_types: activityTypes,
        series_name: seriesName?.trim() || null,
      })
      .select(INSERT_SELECT)
      .single()

    if (insErr) {
      await supabase.storage
        .from(TRAIL_GPX_STORAGE_BUCKET)
        .remove([storagePath])
      throw insErr
    }

    generateAndStoreTrailThumbnail(trailId).catch(() => {})

    return parseTrailRow(inserted as Record<string, unknown>)
  },
}
