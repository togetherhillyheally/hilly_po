"use client"

// 광고 — 페이지당 1번 자리별 1장씩 받아 두고(60초 캐시), 보이면 노출 1회·누르면 클릭을 기록한다.
// viewer 구분은 로그인 없이도 되게 브라우저에 임의 id 를 하나 저장한다 (개인정보 아님, 광고 중복 집계 방지용).
import { useCallback, useEffect, useRef, useState } from "react"
import { broadcastRepo } from "@/lib/repos/broadcastRepo"
import type { AdCampaign, AdSet, BroadcastKind } from "@/lib/repos/broadcastTypes"

const EMPTY: AdSet = { sheet_header: null, chat_inline: null, finish_banner: null }
const CACHE_MS = 60_000
const cache = new Map<string, { at: number; ads: AdSet }>()
const seenImpressions = new Set<string>()

function viewerHash(): string {
  try {
    const k = "hh_viewer"
    let v = localStorage.getItem(k)
    if (!v) {
      v = Math.random().toString(36).slice(2) + Date.now().toString(36)
      localStorage.setItem(k, v)
    }
    return v
  } catch {
    return "anon"
  }
}

export function useBroadcastAds(broadcastId: string | null, kind: BroadcastKind | null) {
  const key = `${broadcastId ?? "-"}:${kind ?? "-"}`
  const [ads, setAds] = useState<AdSet>(() => cache.get(key)?.ads ?? EMPTY)
  const bcRef = useRef(broadcastId)
  bcRef.current = broadcastId

  useEffect(() => {
    const hit = cache.get(key)
    if (hit && Date.now() - hit.at < CACHE_MS) {
      setAds(hit.ads)
      return
    }
    let cancelled = false
    broadcastRepo
      .ads(broadcastId, kind)
      .then((a) => {
        cache.set(key, { at: Date.now(), ads: a })
        if (!cancelled) setAds(a)
      })
      .catch(() => {
        if (!cancelled) setAds(EMPTY)
      })
    return () => {
      cancelled = true
    }
  }, [key, broadcastId, kind])

  // 같은 광고는 이 페이지에서 1번만 노출로 센다 (서버도 10분 중복 무시)
  const impression = useCallback((ad: AdCampaign) => {
    const k = `${ad.id}:${bcRef.current ?? "-"}`
    if (seenImpressions.has(k)) return
    seenImpressions.add(k)
    void broadcastRepo.adEvent(ad.id, bcRef.current, "impression", viewerHash())
  }, [])

  const click = useCallback((ad: AdCampaign) => {
    void broadcastRepo.adEvent(ad.id, bcRef.current, "click", viewerHash())
  }, [])

  return { ads, impression, click }
}
