"use client"

import { useCallback, useEffect, useState } from "react"

/** 이벤트별 즐겨찾기(팔로우) — localStorage 유지, 지도/프로필/사이드바가 공유 */
export function useFavorites(storageKey: string): {
  favs: Set<string>
  toggleFav: (entryId: string) => void
} {
  const [favs, setFavs] = useState<Set<string>>(new Set())
  const storeKey = `tracker-live-favs-${storageKey}`

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storeKey)
      if (raw) setFavs(new Set(JSON.parse(raw) as string[]))
    } catch {
      // 저장된 즐겨찾기 없음/파싱 실패 — 무시
    }
  }, [storeKey])

  const toggleFav = useCallback(
    (entryId: string) => {
      setFavs((prev) => {
        const next = new Set(prev)
        if (next.has(entryId)) next.delete(entryId)
        else next.add(entryId)
        try {
          localStorage.setItem(storeKey, JSON.stringify(Array.from(next)))
        } catch {
          // 저장 실패 — 무시
        }
        return next
      })
    },
    [storeKey],
  )

  return { favs, toggleFav }
}
