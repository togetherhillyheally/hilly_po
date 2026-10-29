"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { trackerControlRepo } from "@/lib/repos/trackerControlRepo"

/**
 * 관제 설정 — 관전 링크. 짧은 주소(slug)를 정하면 /watch/<slug> 로 공유할 수 있다.
 * 기존 /watch/<토큰> 링크도 계속 열린다.
 */
export default function WatchLinkCard({
  eventId,
  publicToken,
  slug,
  onSlugChange,
}: {
  eventId: string
  publicToken: string
  slug: string | null
  onSlugChange: (slug: string | null) => void
}) {
  const [draft, setDraft] = useState(slug ?? "")
  const [saving, setSaving] = useState(false)
  useEffect(() => setDraft(slug ?? ""), [slug])

  const origin = typeof window !== "undefined" ? window.location.origin : ""
  const url = `${origin}/watch/${slug ?? publicToken}`
  const dirty = draft.trim().toLowerCase() !== (slug ?? "")

  async function save() {
    setSaving(true)
    try {
      const saved = await trackerControlRepo.setSlug(eventId, draft)
      onSlugChange(saved)
      toast.success(saved ? "짧은 주소를 저장했어요." : "짧은 주소를 지웠어요.")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장하지 못했어요.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold">관전 링크</h2>
      <div className="flex flex-wrap items-center gap-2">
        <code className="max-w-full truncate rounded-md border bg-muted px-3 py-1.5 text-xs">
          {url}
        </code>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            navigator.clipboard
              .writeText(url)
              .then(() => toast.success("관전 링크를 복사했어요."))
              .catch(() => toast.error("복사에 실패했어요."))
          }
        >
          복사
        </Button>
      </div>
      <p className="pt-1 text-xs text-muted-foreground">
        짧은 주소 — 영문 소문자·숫자·하이픈(-) 2~40자. 비우고 저장하면 해제돼요.
      </p>
      <form
        className="flex max-w-md items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (dirty && !saving) save()
        }}
      >
        <div className="flex h-9 min-w-0 flex-1 items-center rounded-md border bg-background pl-3 text-sm">
          <span className="shrink-0 text-muted-foreground">/watch/</span>
          <Input
            value={draft}
            onChange={(e) =>
              setDraft(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
            }
            placeholder="utnp-9peak"
            maxLength={40}
            className="h-8 min-w-0 border-0 px-1 shadow-none focus-visible:ring-0"
          />
        </div>
        <Button type="submit" size="sm" disabled={!dirty || saving}>
          저장
        </Button>
      </form>
    </div>
  )
}
