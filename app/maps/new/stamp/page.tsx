"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useCurrentUser } from "@/hooks/use-current-user"
import { stampRepo } from "@/lib/repos/stampRepo"

const ORDER_MODES = [
  {
    value: "free",
    label: "자유 순서",
    description: "어느 스탬프든 먼저 찍을 수 있어요",
  },
  {
    value: "ordered",
    label: "정해진 순서",
    description: "1번부터 차례대로 찍어야 해요",
  },
  {
    value: "random",
    label: "랜덤 시작",
    description: "참가자마다 시작 지점이 달라져요",
  },
] as const

export default function NewStampMapPage() {
  const router = useRouter()
  const { user } = useCurrentUser()
  const [name, setName] = useState("")
  const [orderMode, setOrderMode] =
    useState<(typeof ORDER_MODES)[number]["value"]>("free")
  const [creating, setCreating] = useState(false)

  async function handleCreate() {
    if (!user || creating) return
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error("지도 이름을 입력해 주세요.")
      return
    }
    setCreating(true)
    try {
      const trailId = await stampRepo.createStampMap({
        name: trimmed,
        stamp_order_mode: orderMode,
        created_by: user.id,
        points: [],
      })
      toast.success("스탬프지도를 만들었어요. 지도를 클릭해 스탬프를 놓아 보세요.")
      router.replace(`/maps/${trailId}/edit`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "지도 생성에 실패했어요.")
      setCreating(false)
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-bold">스탬프지도 만들기</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        만든 뒤 지도를 클릭해 스탬프 포인트를 배치해요.
      </p>

      <div className="mt-8 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="stamp-name">지도 이름</Label>
          <Input
            id="stamp-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 우리동네 벚꽃 스탬프 투어"
            className="h-11"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label>스탬프 순서</Label>
          <RadioGroup
            value={orderMode}
            onValueChange={(v) => setOrderMode(v as typeof orderMode)}
            className="gap-2"
          >
            {ORDER_MODES.map((mode) => (
              <label
                key={mode.value}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                  orderMode === mode.value
                    ? "border-foreground/40 bg-muted/40"
                    : "hover:bg-muted/20"
                }`}
              >
                <RadioGroupItem value={mode.value} className="mt-0.5" />
                <span>
                  <span className="block text-sm font-medium">
                    {mode.label}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {mode.description}
                  </span>
                </span>
              </label>
            ))}
          </RadioGroup>
        </div>

        <Button
          className="h-12 w-full text-base"
          onClick={handleCreate}
          disabled={creating || !name.trim()}
        >
          {creating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 만드는 중…
            </>
          ) : (
            "스탬프지도 만들기"
          )}
        </Button>
      </div>
    </main>
  )
}
