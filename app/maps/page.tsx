"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Loader2,
  MapPin,
  Mountain,
  Plus,
  Route,
  Stamp,
  Trash2,
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useCurrentUser } from "@/hooks/use-current-user"
import { trailRepo } from "@/lib/repos/trailRepo"
import { trailThumbnailUrl } from "@/lib/repos/trailThumbnail"
import type { Trail } from "@/lib/repos/trailTypes"

export default function MapsDashboardPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useCurrentUser()
  const [trails, setTrails] = useState<Trail[] | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Trail | null>(null)
  const [deleting, setDeleting] = useState(false)

  const reload = useCallback(async (userId: string) => {
    try {
      setTrails(await trailRepo.listMyTrails(userId))
    } catch {
      toast.error("지도 목록을 불러오지 못했어요.")
      setTrails([])
    }
  }, [])

  useEffect(() => {
    if (user) reload(user.id)
  }, [user, reload])

  async function handleDelete() {
    if (!deleteTarget || !user) return
    setDeleting(true)
    try {
      await trailRepo.deleteUploadedTrail(deleteTarget.id, user.id)
      toast.success("지도를 삭제했어요.")
      setDeleteTarget(null)
      reload(user.id)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "삭제에 실패했어요.")
    } finally {
      setDeleting(false)
    }
  }

  const isLoading = userLoading || trails === null

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">내 지도</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            만든 지도는 힐리힐리 앱에서 바로 플레이할 수 있어요.
          </p>
        </div>
        <Button asChild>
          <Link href="/maps/new">
            <Plus className="mr-1.5 h-4 w-4" />새 지도
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 불러오는 중…
        </div>
      ) : trails.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed py-20 text-center">
          <MapPin className="h-10 w-10 text-muted-foreground" />
          <div>
            <p className="font-medium">아직 만든 지도가 없어요</p>
            <p className="mt-1 text-sm text-muted-foreground">
              GPX 코스를 올리거나, 지도를 클릭해 스탬프 지도를 만들어 보세요.
            </p>
          </div>
          <Button asChild>
            <Link href="/maps/new">첫 지도 만들기</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trails.map((trail) => {
            const thumb = trailThumbnailUrl(trail.thumbnail_path)
            const isStamp = trail.map_type === "stamp"
            return (
              <div
                key={trail.id}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-md"
                onClick={() => router.push(`/maps/${trail.id}/edit`)}
              >
                <div className="relative aspect-[16/9] bg-muted">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb}
                      alt={trail.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      {isStamp ? (
                        <Stamp className="h-8 w-8" />
                      ) : (
                        <Route className="h-8 w-8" />
                      )}
                    </div>
                  )}
                  <Badge
                    variant="secondary"
                    className="absolute left-3 top-3 shadow"
                  >
                    {isStamp ? "스탬프지도" : "코스지도"}
                  </Badge>
                </div>
                <div className="flex items-start justify-between gap-2 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{trail.name}</p>
                    <p className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                      {trail.distance_km != null && (
                        <span className="flex items-center gap-1">
                          <Route className="h-3 w-3" />
                          {trail.distance_km}km
                        </span>
                      )}
                      {trail.total_ascent_m != null && (
                        <span className="flex items-center gap-1">
                          <Mountain className="h-3 w-3" />
                          {trail.total_ascent_m}m
                        </span>
                      )}
                      {trail.series_name && (
                        <span className="truncate">{trail.series_name}</span>
                      )}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteTarget(trail)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>지도를 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.name}&rdquo; 지도와 체크포인트, 사진이 모두
              삭제돼요. 되돌릴 수 없어요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "삭제 중…" : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}
