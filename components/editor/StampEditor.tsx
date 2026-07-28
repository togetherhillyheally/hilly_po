"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  ArrowDown,
  ArrowUp,
  Eye,
  Loader2,
  MousePointerClick,
  Stamp as StampIcon,
  Trash2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import StampMap, { type LatLng } from "@/components/map/StampMap"
import StampGuideView from "./StampGuideView"
import { PublishBar } from "./PublishBar"
import { QuizForm, isQuizComplete, type QuizValue } from "./QuizForm"
import { DEFAULT_RADIUS_M, RadiusControl } from "./RadiusControl"
import { parseStampTitle, pickUnusedEntry } from "@/lib/stamp-pool"
import { stampRepo, type StampPointDraft } from "@/lib/repos/stampRepo"
import type { Trail } from "@/lib/repos/trailTypes"

type OrderMode = "ordered" | "free" | "random"

interface DraftPoint extends StampPointDraft {
  quiz: QuizValue | null
}

const ORDER_LABELS: Record<OrderMode, string> = {
  free: "자유 순서",
  ordered: "정해진 순서",
  random: "랜덤 시작",
}

export default function StampEditor({
  trail,
  userId,
}: {
  trail: Trail
  userId: string
}) {
  const [mode, setMode] = useState<"view" | "edit">("view")
  const [name, setName] = useState(trail.name)
  const [orderMode, setOrderMode] = useState<OrderMode>(
    trail.stamp_order_mode ?? "free",
  )
  const [points, setPoints] = useState<DraftPoint[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [addMode, setAddMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const load = useCallback(async () => {
    try {
      const rows = await stampRepo.listPoints(trail.id)
      setPoints(
        rows.map((p) => ({
          id: p.id,
          title: p.title,
          hint: p.hint,
          lng: p.lng,
          lat: p.lat,
          radius_m: p.radius_m,
          quiz:
            p.quiz_question && p.quiz_choices
              ? {
                  question: p.quiz_question,
                  choices: p.quiz_choices,
                  answerIndex: p.quiz_answer_index ?? 0,
                }
              : null,
        })),
      )
    } catch {
      toast.error("스탬프 포인트를 불러오지 못했어요.")
      setPoints([])
    }
  }, [trail.id])

  useEffect(() => {
    load()
  }, [load])

  const selected = useMemo(
    () => (points ?? []).find((p) => p.id === selectedId) ?? null,
    [points, selectedId],
  )

  function patchSelected(patch: Partial<DraftPoint>) {
    if (!selectedId) return
    setPoints((prev) =>
      (prev ?? []).map((p) => (p.id === selectedId ? { ...p, ...patch } : p)),
    )
    setDirty(true)
  }

  function addPointAt(p: LatLng) {
    const current = points ?? []
    const usedIcons = new Set(
      current
        .map((pt) => parseStampTitle(pt.title).entry?.icon)
        .filter((v): v is string => !!v),
    )
    const entry = pickUnusedEntry(usedIcons)
    const point: DraftPoint = {
      id: crypto.randomUUID(),
      title: `${entry.icon}|${entry.name}`,
      hint: null,
      lng: p.lng,
      lat: p.lat,
      radius_m: null,
      quiz: null,
    }
    setPoints([...current, point])
    setSelectedId(point.id)
    setAddMode(false)
    setDirty(true)
  }

  function removePoint(id: string) {
    setPoints((prev) => (prev ?? []).filter((p) => p.id !== id))
    if (selectedId === id) setSelectedId(null)
    setDirty(true)
  }

  function move(id: string, dir: -1 | 1) {
    setPoints((prev) => {
      const arr = [...(prev ?? [])]
      const idx = arr.findIndex((p) => p.id === id)
      const target = idx + dir
      if (idx < 0 || target < 0 || target >= arr.length) return arr
      ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
      return arr
    })
    setDirty(true)
  }

  async function save(): Promise<boolean> {
    if (saving || points === null) return false
    const trimmedName = name.trim()
    if (!trimmedName) {
      toast.error("지도 이름을 입력해 주세요.")
      return false
    }
    for (const p of points) {
      if (p.quiz && !isQuizComplete(p.quiz)) {
        toast.error(
          `"${parseStampTitle(p.title).name}" 스탬프의 퀴즈를 완성해 주세요.`,
        )
        return false
      }
    }
    setSaving(true)
    try {
      await stampRepo.updateStampMap(trail.id, {
        name: trimmedName,
        stamp_order_mode: orderMode,
        series_name: trail.series_name,
        points: points.map((p) => ({
          id: p.id,
          title: p.title,
          hint: p.hint?.trim() || null,
          lng: p.lng,
          lat: p.lat,
          radius_m: p.radius_m ?? null,
          quiz_question: p.quiz ? p.quiz.question.trim() : null,
          quiz_choices: p.quiz ? p.quiz.choices.map((c) => c.trim()) : null,
          quiz_answer_index: p.quiz ? p.quiz.answerIndex : null,
        })),
      })
      setDirty(false)
      toast.success("저장했어요.")
      return true
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장에 실패했어요.")
      return false
    } finally {
      setSaving(false)
    }
  }

  const mapPoints = (points ?? []).map((p, i) => ({
    id: p.id,
    title: p.title,
    lng: p.lng,
    lat: p.lat,
    sort_order: i + 1,
  }))

  const radiusCircles = useMemo(() => {
    if (!selected) return []
    return [
      {
        id: selected.id,
        lng: selected.lng,
        lat: selected.lat,
        radiusM: selected.radius_m ?? DEFAULT_RADIUS_M,
      },
    ]
  }, [selected])

  const selectedName = selected ? parseStampTitle(selected.title).name : ""

  if (mode === "view") {
    return (
      <StampGuideView
        trail={trail}
        points={points ?? []}
        loading={points === null}
        onEdit={() => setMode("edit")}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100vh-3.5rem)] lg:flex-row lg:gap-0">
      <div className="relative flex-1 p-4 lg:pr-2">
        <StampMap
          points={mapPoints}
          bounds={trail.bounds ?? undefined}
          selectedId={selectedId}
          addMode={addMode}
          radiusCircles={radiusCircles}
          onMapClick={addPointAt}
          onMarkerClick={(id) => {
            setSelectedId(id)
            setAddMode(false)
          }}
          height="100%"
          className="min-h-[420px] lg:h-full"
        />
        {addMode && (
          <div className="pointer-events-none absolute left-1/2 top-8 -translate-x-1/2 rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background shadow-lg">
            지도를 클릭해 스탬프 위치를 정해 주세요
          </div>
        )}
      </div>

      <aside className="w-full shrink-0 space-y-4 overflow-y-auto p-4 lg:w-96 lg:pl-2">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs text-muted-foreground">
            스탬프지도 · 스탬프 {(points ?? []).length}개
          </p>
          <Button variant="outline" size="sm" onClick={() => setMode("view")}>
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            보기
          </Button>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-sm">지도 이름</Label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setDirty(true)
              }}
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">스탬프 순서</Label>
            <Select
              value={orderMode}
              onValueChange={(v) => {
                setOrderMode(v as OrderMode)
                setDirty(true)
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ORDER_LABELS) as OrderMode[]).map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {ORDER_LABELS[mode]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          variant={addMode ? "default" : "outline"}
          size="sm"
          className="w-full"
          onClick={() => {
            setAddMode((v) => !v)
            setSelectedId(null)
          }}
        >
          <MousePointerClick className="mr-1.5 h-4 w-4" />
          {addMode ? "추가 모드 끄기" : "지도 클릭으로 스탬프 추가"}
        </Button>

        {points === null ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : points.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            <StampIcon className="mx-auto mb-2 h-6 w-6" />
            아직 스탬프가 없어요.
            <br />
            지도를 클릭해 첫 스탬프를 놓아 보세요.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {points.map((p, i) => {
              const { entry, name: pointName } = parseStampTitle(p.title)
              const Icon = entry?.Icon
              return (
                <li key={p.id}>
                  <div
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                      selectedId === p.id
                        ? "border-foreground/40 bg-muted/50"
                        : "hover:bg-muted/30"
                    }`}
                    onClick={() =>
                      setSelectedId(selectedId === p.id ? null : p.id)
                    }
                  >
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 bg-white"
                      style={{ borderColor: entry?.color ?? "#fb923c" }}
                    >
                      {Icon ? (
                        <Icon
                          className="h-3.5 w-3.5"
                          style={{ color: entry?.color }}
                        />
                      ) : (
                        <span className="text-xs font-bold">{i + 1}</span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {i + 1}. {pointName || "스탬프"}
                    </span>
                    <span className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        disabled={i === 0}
                        onClick={(e) => {
                          e.stopPropagation()
                          move(p.id, -1)
                        }}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        disabled={i === points.length - 1}
                        onClick={(e) => {
                          e.stopPropagation()
                          move(p.id, 1)
                        }}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </div>

                  {selectedId === p.id && selected && (
                    <div className="mt-1.5 space-y-4 rounded-xl border p-3.5">
                      <div className="space-y-2">
                        <Label className="text-sm">스탬프 이름</Label>
                        <Input
                          value={selectedName}
                          onChange={(e) => {
                            const iconPart =
                              parseStampTitle(selected.title).entry?.icon ?? ""
                            patchSelected({
                              title: iconPart
                                ? `${iconPart}|${e.target.value}`
                                : e.target.value,
                            })
                          }}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">힌트 · 설명</Label>
                        <Input
                          value={selected.hint ?? ""}
                          onChange={(e) =>
                            patchSelected({ hint: e.target.value })
                          }
                          placeholder="예: 공원 입구 큰 소나무 아래"
                          className="h-9"
                        />
                      </div>
                      <Separator />
                      <RadiusControl
                        value={selected.radius_m ?? null}
                        onChange={(v) => patchSelected({ radius_m: v })}
                      />
                      <Separator />
                      <QuizForm
                        value={selected.quiz}
                        onChange={(q) => patchSelected({ quiz: q })}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-destructive hover:text-destructive"
                        onClick={() => removePoint(p.id)}
                      >
                        <Trash2 className="mr-1.5 h-4 w-4" /> 스탬프 삭제
                      </Button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        <div className="sticky bottom-0 -mx-4 border-t bg-background/95 p-4 backdrop-blur lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0">
          <PublishBar
            trail={trail}
            pointCount={(points ?? []).length}
            pointNoun="스탬프"
            onBeforePublish={async () => (dirty ? await save() : true)}
          />
        </div>
      </aside>
    </div>
  )
}
