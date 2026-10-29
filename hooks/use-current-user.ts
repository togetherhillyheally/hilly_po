"use client"

import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { getSupabase } from "@/lib/supabase/client"

// 탭 안에서 마지막으로 확인한 로그인 사용자 — 페이지를 옮겨 헤더가 다시 마운트돼도
// 바로 보여 주고(깜빡임 없음), 서버 확인은 뒤에서 다시 한다. undefined = 아직 모름
let cachedUser: User | null | undefined

export function useCurrentUser(): { user: User | null; loading: boolean } {
  const [user, setUser] = useState<User | null>(cachedUser ?? null)
  const [loading, setLoading] = useState(cachedUser === undefined)

  useEffect(() => {
    const supabase = getSupabase()
    supabase.auth.getUser().then(({ data }) => {
      cachedUser = data.user ?? null
      setUser(cachedUser)
      setLoading(false)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      cachedUser = session?.user ?? null
      setUser(cachedUser)
    })
    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}
