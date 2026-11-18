"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { LogIn, Send } from "lucide-react"
import { toast } from "sonner"

const MAX = 500

/** 비로그인 — 읽기는 되지만 쓰려면 로그인. 돌아올 주소를 next 로 넘긴다 */
export function LoginPrompt({ text = "응원을 남기려면 로그인해 주세요" }: { text?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  return (
    <button
      type="button"
      onClick={() => router.push(`/login?next=${encodeURIComponent(pathname ?? "/")}`)}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted"
    >
      <LogIn className="h-4 w-4" />
      {text}
    </button>
  )
}

/** 입력창 — Enter 로 보내기(Shift+Enter 줄바꿈), 2초 쿨다운, 500자 제한 */
export default function ChatComposer({
  onSend,
  posting,
  cooldownUntil,
  disabled,
  disabledText,
  placeholder = "응원 한마디",
}: {
  onSend: (text: string) => Promise<void>
  posting: boolean
  cooldownUntil: number
  disabled?: boolean
  disabledText?: string
  placeholder?: string
}) {
  const [text, setText] = useState("")
  const [now, setNow] = useState(Date.now())
  const taRef = useRef<HTMLTextAreaElement>(null)
  const cooling = cooldownUntil > now
  useEffect(() => {
    if (!cooling) return
    const t = setInterval(() => setNow(Date.now()), 200)
    return () => clearInterval(t)
  }, [cooling, cooldownUntil])

  const submit = async () => {
    const v = text.trim()
    if (!v || posting || cooling || disabled) return
    try {
      await onSend(v)
      setText("")
      taRef.current?.focus()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "메시지를 보내지 못했어요.")
    }
  }

  if (disabled) {
    return (
      <p className="rounded-xl bg-muted px-3 py-2.5 text-center text-xs text-muted-foreground">
        {disabledText ?? "지금은 채팅이 닫혀 있어요"}
      </p>
    )
  }

  return (
    <div className="flex items-end gap-2">
      <textarea
        ref={taRef}
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, MAX))}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault()
            void submit()
          }
        }}
        rows={1}
        placeholder={placeholder}
        enterKeyHint="send"
        className="max-h-24 min-h-[40px] flex-1 resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#DC2F55]/40"
      />
      <button
        type="button"
        onClick={() => void submit()}
        disabled={!text.trim() || posting || cooling}
        aria-label="보내기"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#DC2F55] text-white transition active:scale-95 disabled:opacity-40"
      >
        <Send className="h-4 w-4" />
      </button>
    </div>
  )
}
