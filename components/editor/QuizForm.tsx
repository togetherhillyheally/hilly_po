"use client"

import { CircleCheck, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

export interface QuizValue {
  question: string
  choices: string[]
  answerIndex: number
}

const MAX_CHOICES = 4
const MIN_CHOICES = 2

export function emptyQuiz(): QuizValue {
  return { question: "", choices: ["", ""], answerIndex: 0 }
}

/** 저장 가능 여부 — 질문과 모든 선택지가 채워져야 함 */
export function isQuizComplete(q: QuizValue): boolean {
  return (
    q.question.trim().length > 0 &&
    q.choices.length >= MIN_CHOICES &&
    q.choices.every((c) => c.trim().length > 0) &&
    q.answerIndex >= 0 &&
    q.answerIndex < q.choices.length
  )
}

/** 객관식 퀴즈 편집 — value=null 이면 퀴즈 없음 */
export function QuizForm({
  value,
  onChange,
}: {
  value: QuizValue | null
  onChange: (v: QuizValue | null) => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm">객관식 퀴즈</Label>
        <Switch
          checked={value != null}
          onCheckedChange={(on) => onChange(on ? emptyQuiz() : null)}
        />
      </div>

      {value && (
        <div className="space-y-3 rounded-xl border p-3">
          <Input
            value={value.question}
            onChange={(e) => onChange({ ...value, question: e.target.value })}
            placeholder="질문 (예: 이 정자의 이름은?)"
          />
          <div className="space-y-2">
            {value.choices.map((choice, i) => (
              <div key={i} className="flex items-center gap-2">
                <button
                  type="button"
                  title="정답으로 선택"
                  onClick={() => onChange({ ...value, answerIndex: i })}
                  className={
                    value.answerIndex === i
                      ? "text-green-500"
                      : "text-muted-foreground/40 hover:text-muted-foreground"
                  }
                >
                  <CircleCheck className="h-5 w-5" />
                </button>
                <Input
                  value={choice}
                  onChange={(e) => {
                    const choices = [...value.choices]
                    choices[i] = e.target.value
                    onChange({ ...value, choices })
                  }}
                  placeholder={`선택지 ${i + 1}`}
                  className="h-9"
                />
                {value.choices.length > MIN_CHOICES && (
                  <button
                    type="button"
                    onClick={() => {
                      const choices = value.choices.filter((_, j) => j !== i)
                      const answerIndex =
                        value.answerIndex === i
                          ? 0
                          : value.answerIndex > i
                            ? value.answerIndex - 1
                            : value.answerIndex
                      onChange({ ...value, choices, answerIndex })
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {value.choices.length < MAX_CHOICES && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                onChange({ ...value, choices: [...value.choices, ""] })
              }
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> 선택지 추가
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            초록 체크가 정답이에요. 앱에서 도착 시 퀴즈가 표시돼요.
          </p>
        </div>
      )}
    </div>
  )
}
