"use client"

import { useEffect, useState } from "react"
import { trackerControlRepo } from "@/lib/repos/trackerControlRepo"

/** 본인 슈퍼관리자 여부 — null 은 확인 중 */
export function useSuperAdmin(): { isAdmin: boolean | null } {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    trackerControlRepo
      .isSuperAdminSelf()
      .then((v) => {
        if (!cancelled) setIsAdmin(v)
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { isAdmin }
}
