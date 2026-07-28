"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { trailRepo } from "@/lib/repos/trailRepo"
import type { Trail } from "@/lib/repos/trailTypes"

/**
 * 에디터 하단 저장 바.
 * - 공개/비공개는 상태(작성중/저장됨)와 무관하게 항상 토글 가능.
 * - "저장" 버튼 하나만 표시. 성공 시 published 로 전환하고 내 지도 목록으로 이동.
 *   (편집 화면 진입 자체는 보기/수정 모드 전환으로 처리하므로 별도 "수정" 단계는 없음)
 */
export function PublishBar({
  trail,
  pointCount,
  pointNoun,
  onBeforePublish,
}: {
  trail: Trail
  pointCount: number
  pointNoun: string
  /** 저장(발행) 직전 훅 — false 반환 시 중단 (예: 미저장 변경사항 저장 실패) */
  onBeforePublish?: () => Promise<boolean>
}) {
  const router = useRouter()
  const [status, setStatus] = useState(trail.status)
  const [visibility, setVisibility] = useState(trail.visibility)
  const [busy, setBusy] = useState(false)

  async function toggleVisibility() {
    if (busy) return
    const next = visibility === "private" ? "public" : "private"
    setVisibility(next)
    try {
      await trailRepo.updateTrailVisibility(trail.id, next)
    } catch (e) {
      setVisibility(visibility)
      toast.error(e instanceof Error ? e.message : "전환에 실패했어요.")
    }
  }

  async function save() {
    if (pointCount < 1) {
      toast.error(`${pointNoun}를 1개 이상 놓아야 저장할 수 있어요.`)
      return
    }
    setBusy(true)
    try {
      if (onBeforePublish && !(await onBeforePublish())) return
      await trailRepo.updateTrailStatus(trail.id, "published")
      setStatus("published")
      toast.success("저장했어요.")
      router.push("/maps")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장에 실패했어요.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
        <div className="text-sm leading-tight">
          <p className="font-medium">
            {visibility === "private" ? "비공개" : "공개"}
          </p>
          <p className="text-xs text-muted-foreground">
            {visibility === "private"
              ? "나에게만 보여요"
              : "힐리힐리 앱에서 누구나 볼 수 있어요"}
          </p>
        </div>
        <Switch
          checked={visibility !== "private"}
          onCheckedChange={toggleVisibility}
          disabled={busy}
        />
      </div>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {status === "draft" ? (
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            작성중 · 저장하기 전까지 앱에 반영되지 않아요
          </>
        ) : (
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            저장됨 · 힐리힐리 앱에 반영 중
          </>
        )}
      </p>

      <Button
        className="h-11 w-full bg-[#DC2F55] text-white hover:bg-[#DC2F55]/90"
        onClick={save}
        disabled={busy}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "저장"}
      </Button>
    </div>
  )
}
