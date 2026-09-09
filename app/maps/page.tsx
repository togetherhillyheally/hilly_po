"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  Link2,
  MapPin,
  Mountain,
  Plus,
  Route,
  Stamp,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";
import { trailRepo } from "@/lib/repos/trailRepo";
import { trailThumbnailUrl } from "@/lib/repos/trailThumbnail";
import type { Trail } from "@/lib/repos/trailTypes";

type StatusFilter = "all" | "draft" | "published";

const FILTER_LABELS: Record<StatusFilter, string> = {
  all: "전체",
  draft: "작성중",
  published: "완료",
};

export default function MapsDashboardPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useCurrentUser();
  const [trails, setTrails] = useState<Trail[] | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [deleteTarget, setDeleteTarget] = useState<Trail | null>(null);
  const [deleting, setDeleting] = useState(false);
  // 썸네일 파일이 없거나 로드 실패한 지도 — 깨진 이미지 대신 아이콘 폴백
  const [failedThumbs, setFailedThumbs] = useState<Set<string>>(new Set());

  const reload = useCallback(async (userId: string) => {
    try {
      setTrails(await trailRepo.listMyTrails(userId));
    } catch {
      toast.error("지도 목록을 불러오지 못했어요.");
      setTrails([]);
    }
  }, []);

  useEffect(() => {
    if (user) reload(user.id);
  }, [user, reload]);

  async function toggleVisibility(trail: Trail) {
    const next = trail.visibility === "private" ? "public" : "private";
    setTrails(
      (prev) =>
        prev?.map((t) =>
          t.id === trail.id ? { ...t, visibility: next } : t,
        ) ?? prev,
    );
    try {
      await trailRepo.updateTrailVisibility(trail.id, next);
      toast.success(
        next === "private"
          ? "비공개로 전환했어요. 앱에서 나에게만 보여요."
          : "지도를 공개했어요.",
      );
    } catch {
      setTrails(
        (prev) =>
          prev?.map((t) =>
            t.id === trail.id ? { ...t, visibility: trail.visibility } : t,
          ) ?? prev,
      );
      toast.error("전환에 실패했어요.");
    }
  }

  async function handleDelete() {
    if (!deleteTarget || !user) return;
    setDeleting(true);
    try {
      await trailRepo.deleteUploadedTrail(deleteTarget.id, user.id);
      toast.success("지도를 삭제했어요.");
      setDeleteTarget(null);
      reload(user.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "삭제에 실패했어요.");
    } finally {
      setDeleting(false);
    }
  }

  const isLoading = userLoading || trails === null;
  const visibleTrails =
    trails?.filter((t) => filter === "all" || t.status === filter) ?? [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">내 지도</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            완료한 지도만 힐리힐리 앱에 공개돼요.
          </p>
        </div>
        <Button
          asChild
          className="bg-[#DC2F55] text-white hover:bg-[#DC2F55]/90"
        >
          <Link href="/maps/new">
            <Plus className="mr-1.5 h-4 w-4" />새 지도
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border bg-card">
              <div className="aspect-[16/9] animate-pulse bg-muted" />
              <div className="space-y-2.5 p-4">
                <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : trails.length === 0 ? null : (
        <div className="mb-5 flex gap-1.5">
          {(Object.keys(FILTER_LABELS) as StatusFilter[]).map((f) => {
            const count =
              f === "all"
                ? trails.length
                : trails.filter((t) => t.status === f).length;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                  filter === f
                    ? "border-foreground bg-foreground text-background"
                    : "text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                }`}
              >
                {FILTER_LABELS[f]}{" "}
                <span className="tabular-nums opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {isLoading ? null : trails.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed py-20 text-center">
          <MapPin className="h-10 w-10 text-muted-foreground" />
          <div>
            <p className="font-medium">아직 만든 지도가 없어요</p>
            <p className="mt-1 text-sm text-muted-foreground">
              GPX 코스를 올리거나, 지도를 클릭해 스탬프 지도를 만들어 보세요.
            </p>
          </div>
          <Button
            asChild
            className="bg-[#DC2F55] text-white hover:bg-[#DC2F55]/90"
          >
            <Link href="/maps/new">첫 지도 만들기</Link>
          </Button>
        </div>
      ) : visibleTrails.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-16 text-center text-sm text-muted-foreground">
          {filter === "draft"
            ? "작성중인 지도가 없어요."
            : "완료한 지도가 없어요."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleTrails.map((trail) => {
            const thumb = failedThumbs.has(trail.id)
              ? null
              : trailThumbnailUrl(trail.thumbnail_path);
            const isStamp = trail.map_type === "stamp";
            return (
              <div
                key={trail.id}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/25 hover:shadow-lg"
                onClick={() => router.push(`/maps/${trail.id}/edit`)}
              >
                <div className="relative aspect-[16/9] bg-muted">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb}
                      alt={trail.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      onError={() =>
                        setFailedThumbs((prev) => new Set(prev).add(trail.id))
                      }
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-[radial-gradient(80%_120%_at_50%_0%,rgba(220,47,85,0.08),transparent_65%)] text-muted-foreground">
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
                  {trail.status === "draft" ? (
                    <Badge className="absolute right-3 top-3 border-transparent bg-amber-500 text-white shadow hover:bg-amber-500">
                      작성중
                    </Badge>
                  ) : trail.visibility === "private" ? (
                    <Badge className="absolute right-3 top-3 border-transparent bg-zinc-600 text-white shadow hover:bg-zinc-600">
                      비공개
                    </Badge>
                  ) : null}
                </div>
                <div className="flex items-start justify-between gap-2 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{trail.name}</p>
                    <p className="mt-0.5 flex items-center gap-3 text-xs tabular-nums text-muted-foreground">
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
                  <div className="flex shrink-0 items-center">
                    {trail.status === "published" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title={
                          trail.visibility === "private"
                            ? "공개로 전환"
                            : "비공개로 전환"
                        }
                        className={`h-8 w-8 text-muted-foreground transition-opacity focus-visible:opacity-100 ${
                          trail.visibility === "private"
                            ? ""
                            : "sm:opacity-0 sm:group-hover:opacity-100"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleVisibility(trail);
                        }}
                      >
                        {trail.visibility === "private" ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    {trail.status === "published" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="공유 링크 복사"
                          className="h-8 w-8 text-muted-foreground transition-opacity focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard
                              .writeText(
                                `${window.location.origin}/m/${trail.id}`,
                              )
                              .then(() =>
                                toast.success("공유 링크를 복사했어요."),
                              )
                              .catch(() => toast.error("복사에 실패했어요."));
                          }}
                        >
                          <Link2 className="h-4 w-4" />
                        </Button>
                      )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive transition-opacity hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(trail);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
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
                e.preventDefault();
                handleDelete();
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
  );
}
