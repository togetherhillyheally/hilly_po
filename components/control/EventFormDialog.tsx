"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { trackerControlRepo } from "@/lib/repos/trackerControlRepo"
import type { TrackerEvent } from "@/lib/repos/trackerControlTypes"

const NO_TRAIL = "none"

function toLocalInput(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromLocalInput(value: string): string | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export type EventFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null = 새 이벤트 */
  event: TrackerEvent | null
  onSaved: () => void
}

export default function EventFormDialog({
  open,
  onOpenChange,
  event,
  onSaved,
}: EventFormDialogProps) {
  const [title, setTitle] = useState("")
  const [eventType, setEventType] = useState<"race" | "monitor">("race")
  const [trailId, setTrailId] = useState<string>(NO_TRAIL)
  const [startsAt, setStartsAt] = useState("")
  const [endsAt, setEndsAt] = useState("")
  const [trails, setTrails] = useState<
    { id: string; name: string; distance_km: number | null }[] | null
  >(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle(event?.title ?? "")
    setEventType(event?.event_type ?? "race")
    setTrailId(event?.trail_id ?? NO_TRAIL)
    setStartsAt(toLocalInput(event?.starts_at ?? null))
    setEndsAt(toLocalInput(event?.ends_at ?? null))
    if (trails === null) {
      trackerControlRepo
        .listSelectableTrails()
        .then(setTrails)
        .catch(() => {
          toast.error("코스 목록을 불러오지 못했어요.")
          setTrails([])
        })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, event])

  async function handleSave() {
    if (!title.trim()) {
      toast.error("이벤트 이름을 입력해 주세요.")
      return
    }
    if (eventType === "race" && trailId === NO_TRAIL) {
      toast.error("대회 이벤트는 코스를 선택해 주세요.")
      return
    }
    setSaving(true)
    try {
      await trackerControlRepo.upsertEvent({
        id: event?.id ?? null,
        title: title.trim(),
        event_type: eventType,
        trail_id: trailId === NO_TRAIL ? null : trailId,
        starts_at: fromLocalInput(startsAt),
        ends_at: fromLocalInput(endsAt),
        status: null,
      })
      toast.success(event ? "이벤트를 수정했어요." : "이벤트를 만들었어요.")
      onOpenChange(false)
      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장에 실패했어요.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{event ? "이벤트 수정" : "새 이벤트"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="event-title">이벤트 이름</Label>
            <Input
              id="event-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: MT710 테스트 대회"
            />
          </div>
          <div className="space-y-2">
            <Label>유형</Label>
            <Select
              value={eventType}
              onValueChange={(v) => setEventType(v as "race" | "monitor")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="race">대회 (코스·순위)</SelectItem>
                <SelectItem value="monitor">모니터링 (위치만)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>코스</Label>
            <Select value={trailId} onValueChange={setTrailId}>
              <SelectTrigger>
                <SelectValue
                  placeholder={trails === null ? "불러오는 중…" : "코스 선택"}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_TRAIL}>코스 없음</SelectItem>
                {(trails ?? []).map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                    {t.distance_km != null && ` · ${t.distance_km.toFixed(1)}km`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="event-starts">시작</Label>
              <Input
                id="event-starts"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-ends">종료</Label>
              <Input
                id="event-ends"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#DC2F55] text-white hover:bg-[#DC2F55]/90"
          >
            {saving ? "저장 중…" : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
