"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import CourseEditor from "@/components/editor/CourseEditor"
import StampEditor from "@/components/editor/StampEditor"
import { useCurrentUser } from "@/hooks/use-current-user"
import { trailRepo } from "@/lib/repos/trailRepo"
import type { Trail } from "@/lib/repos/trailTypes"

export default function EditMapPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { user, loading: userLoading } = useCurrentUser()
  const [trail, setTrail] = useState<Trail | null | undefined>(undefined)

  useEffect(() => {
    trailRepo
      .getTrailById(id)
      .then(setTrail)
      .catch(() => setTrail(null))
  }, [id])

  useEffect(() => {
    if (!trail) return
    const prevTitle = document.title
    document.title = `${trail.name} | 힐리힐리지도`
    return () => {
      document.title = prevTitle
    }
  }, [trail])

  if (userLoading || trail === undefined) {
    return (
      <div className="flex items-center justify-center py-32 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 불러오는 중…
      </div>
    )
  }

  if (!trail || !user || trail.created_by !== user.id) {
    return (
      <div className="flex flex-col items-center gap-4 py-32 text-center">
        <p className="font-medium">지도를 찾을 수 없거나 편집 권한이 없어요.</p>
        <Button asChild variant="outline">
          <Link href="/maps">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> 내 지도로 돌아가기
          </Link>
        </Button>
      </div>
    )
  }

  return trail.map_type === "stamp" ? (
    <StampEditor trail={trail} userId={user.id} />
  ) : (
    <CourseEditor trail={trail} userId={user.id} />
  )
}
