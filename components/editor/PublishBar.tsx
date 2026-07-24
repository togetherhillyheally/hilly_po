"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { trailRepo } from "@/lib/repos/trailRepo"
import type { Trail } from "@/lib/repos/trailTypes"

/**
 * 에디터 하단 완료/공개 바.
 * draft: "완료하고 앱에 공개" — published: 공개 중 표시 + 작성중으로 전환.
 * onSave 를 넘기면 저장 버튼도 함께 렌더링 (스탬프 에디터처럼 수동 저장이 있는 경우).
 */
export function PublishBar({
  trail,
  pointCount,
  pointNoun,
  dirty,
  saving,
  onSave,
  onBeforePublish,
}: {
  trail: Trail
  pointCount: number
  pointNoun: string
  dirty?: boolean
  saving?: boolean
  onSave?: () => void
  /** 공개 직전 훅 — false 반환 시 중단 (예: 미저장 변경사항 저장 실패) */
  onBeforePublish?: () => Promise<boolean>
}) {
  const [status, setStatus] = useState(trail.status)
  const [visibility, setVisibility] = useState(trail.visibility)
  const [busy, setBusy] = useState(false)

  async function publish() {
    if (busy) return
    if (pointCount < 1) {
      toast.error(`${pointNoun}를 1개 이상 놓아야 완료할 수 있어요.`)
      return
    }
    setBusy(true)
    try {
      if (onBeforePublish && !(await onBeforePublish())) return
      await trailRepo.updateTrailStatus(trail.id, "published")
      setStatus("published")
      setVisibility("public")
      toast.success("완료! 힐리힐리 앱에 공개됐어요.")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "완료 처리에 실패했어요.")
    } finally {
      setBusy(false)
    }
  }

  async function unpublish() {
    if (busy) return
    setBusy(true)
    try {
      await trailRepo.updateTrailStatus(trail.id, "draft")
      setStatus("draft")
      toast.success("작성중으로 전환했어요. 앱에서 다른 사람에게 보이지 않아요.")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "전환에 실패했어요.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2.5">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {status === "draft" ? (
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            작성중 · 완료하기 전까지 앱에 공개되지 않아요
          </>
        ) : visibility === "private" ? (
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
            완료 · 비공개 — 내 지도에서 다시 공개할 수 있어요
          </>
        ) : (
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            완료 · 힐리힐리 앱에 공개 중
          </>
        )}
      </p>
      <div className="flex gap-2">
        {onSave && (
          <Button
            variant="outline"
            className="h-11 flex-1"
            onClick={onSave}
            disabled={saving || !dirty}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : dirty ? (
              "변경사항 저장"
            ) : (
              "저장됨"
            )}
          </Button>
        )}
        {status === "draft" ? (
          <Button
            className="h-11 flex-1 bg-[#DC2F55] text-white hover:bg-[#DC2F55]/90"
            onClick={publish}
            disabled={busy || saving}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "완료하고 앱에 공개"
            )}
          </Button>
        ) : (
          <Button
            variant="outline"
            className="h-11 flex-1"
            onClick={unpublish}
            disabled={busy || saving}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "작성중으로 전환"
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
