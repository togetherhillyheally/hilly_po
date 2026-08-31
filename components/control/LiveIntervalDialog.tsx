"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { trackerControlRepo } from "@/lib/repos/trackerControlRepo"

/** 모험 라이브 위치 업로드 주기 설정 — 앱이 10분 캐시로 읽어감 */
export default function LiveIntervalDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [soloSec, setSoloSec] = useState("15")
  const [groupSec, setGroupSec] = useState("3")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    trackerControlRepo
      .getLiveUploadSettings()
      .then((s) => {
        setSoloSec(String(s.solo_interval_sec))
        setGroupSec(String(s.group_interval_sec))
      })
      .catch(() => toast.error("설정을 불러오지 못했어요."))
  }, [open])

  async function handleSave() {
    const solo = Number(soloSec)
    const group = Number(groupSec)
    if (!Number.isInteger(solo) || solo < 3 || solo > 300) {
      toast.error("솔로 주기는 3~300초 사이여야 해요.")
      return
    }
    if (!Number.isInteger(group) || group < 1 || group > 60) {
      toast.error("그룹 주기는 1~60초 사이여야 해요.")
      return
    }
    setSaving(true)
    try {
      await trackerControlRepo.updateLiveUploadSettings(solo, group)
      toast.success("신호 주기를 저장했어요. 앱에는 10분 내 반영돼요.")
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장에 실패했어요.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>모험 신호 주기</DialogTitle>
          <DialogDescription>
            앱이 위치를 서버에 올리는 간격이에요. 짧을수록 관제가 부드럽지만
            배터리·네트워크 사용이 늘어요.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="solo-sec">솔로 모험 (초)</Label>
            <Input
              id="solo-sec"
              type="number"
              min={3}
              max={300}
              value={soloSec}
              onChange={(e) => setSoloSec(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">3~300초 · 기본 15</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="group-sec">함께 모험 (초)</Label>
            <Input
              id="group-sec"
              type="number"
              min={1}
              max={60}
              value={groupSec}
              onChange={(e) => setGroupSec(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">1~60초 · 기본 3</p>
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
