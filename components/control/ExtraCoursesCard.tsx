"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { X } from "lucide-react"
import { trackerControlRepo } from "@/lib/repos/trackerControlRepo"

type TrailOption = { id: string; name: string; distance_km: number | null }

/**
 * 관제 설정 — 추가 코스 지도.
 * 대표 코스 외에 다른 코스를 달리는 참가자가 섞일 때(예: 9Peak 관제에 7Peak 선수) 관전 화면에서 골라 볼 수 있게 한다.
 */
export default function ExtraCoursesCard({
  eventId,
  mainTrailId,
  onSaved,
}: {
  eventId: string
  mainTrailId: string | null
  onSaved?: () => void
}) {
  const [trails, setTrails] = useState<TrailOption[]>([])
  const [ids, setIds] = useState<string[] | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      trackerControlRepo.listSelectableTrails(),
      trackerControlRepo.getExtraTrails(eventId),
    ])
      .then(([t, x]) => {
        if (cancelled) return
        setTrails(t)
        setIds(x)
      })
      .catch(() => toast.error("추가 지도 정보를 불러오지 못했어요."))
    return () => {
      cancelled = true
    }
  }, [eventId])

  async function save(next: string[]) {
    setSaving(true)
    try {
      setIds(await trackerControlRepo.setExtraTrails(eventId, next))
      toast.success("추가 지도를 저장했어요.")
      onSaved?.()
    } catch {
      toast.error("저장하지 못했어요.")
    } finally {
      setSaving(false)
    }
  }

  const nameOf = (id: string) => trails.find((t) => t.id === id)?.name ?? "알 수 없는 지도"
  const addable = trails.filter(
    (t) => t.id !== mainTrailId && !(ids ?? []).includes(t.id),
  )

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold">추가 지도</h2>
      <p className="text-xs text-muted-foreground">
        다른 코스를 달리는 참가자가 있으면 지도를 추가하세요. 관전 화면에서 지도를 골라 볼 수 있어요.
      </p>
      {ids == null ? (
        <p className="text-xs text-muted-foreground">불러오는 중…</p>
      ) : (
        <>
          {ids.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {ids.map((id) => (
                <li
                  key={id}
                  className="flex items-center gap-1 rounded-full border bg-muted/50 py-1 pl-3 pr-1.5 text-xs font-medium"
                >
                  {nameOf(id)}
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => save(ids.filter((x) => x !== id))}
                    className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="빼기"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <select
            value=""
            disabled={saving || addable.length === 0}
            onChange={(e) => {
              if (e.target.value) save([...ids, e.target.value])
            }}
            className="h-9 w-full max-w-sm rounded-md border bg-background px-2 text-sm"
          >
            <option value="">+ 지도 추가…</option>
            {addable.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.distance_km != null ? ` · ${Number(t.distance_km).toFixed(1)}km` : ""}
              </option>
            ))}
          </select>
        </>
      )}
    </div>
  )
}
