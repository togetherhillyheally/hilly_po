"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Pencil, Plus, Search, Trash2, X } from "lucide-react"
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { trackerControlRepo } from "@/lib/repos/trackerControlRepo"
import type {
  EventEntry,
  TrackerDevice,
} from "@/lib/repos/trackerControlTypes"

function timeAgo(iso: string | null): string {
  if (!iso) return "—"
  const sec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (sec < 60) return `${sec}초 전`
  if (sec < 3600) return `${Math.floor(sec / 60)}분 전`
  if (sec < 86400) return `${Math.floor(sec / 3600)}시간 전`
  return `${Math.floor(sec / 86400)}일 전`
}

export default function EntryManager({ eventId }: { eventId: string }) {
  const [entries, setEntries] = useState<EventEntry[] | null>(null)
  const [devices, setDevices] = useState<TrackerDevice[] | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<EventEntry | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<EventEntry | null>(null)

  // 폼 상태
  const [deviceId, setDeviceId] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [bibNo, setBibNo] = useState("")
  const [category, setCategory] = useState("")
  const [linkedUser, setLinkedUser] = useState<{
    id: string
    nickname: string
  } | null>(null)
  const [memberQuery, setMemberQuery] = useState("")
  const [memberResults, setMemberResults] = useState<
    { id: string; nickname: string }[]
  >([])
  const [saving, setSaving] = useState(false)

  const reload = useCallback(async () => {
    try {
      const [e, d] = await Promise.all([
        trackerControlRepo.listEntries(eventId),
        trackerControlRepo.listAllDevices(),
      ])
      setEntries(e)
      setDevices(d)
    } catch {
      toast.error("참가자 목록을 불러오지 못했어요.")
      setEntries([])
      setDevices([])
    }
  }, [eventId])

  useEffect(() => {
    reload()
  }, [reload])

  const existingCategories = useMemo(
    () =>
      Array.from(
        new Set((entries ?? []).map((e) => e.category).filter(Boolean)),
      ) as string[],
    [entries],
  )

  /** 이 이벤트에 이미 배정된 기기 제외 (수정 중인 엔트리의 기기는 유지) */
  const selectableDevices = useMemo(() => {
    const used = new Set(
      (entries ?? [])
        .filter((e) => e.id !== editing?.id)
        .map((e) => e.device_id),
    )
    return (devices ?? []).filter(
      (d) => !used.has(d.id) && d.status !== "retired",
    )
  }, [devices, entries, editing])

  function openCreate() {
    setEditing(null)
    setDeviceId("")
    setDisplayName("")
    setBibNo("")
    setCategory("")
    setLinkedUser(null)
    setMemberQuery("")
    setMemberResults([])
    setFormOpen(true)
  }

  function openEdit(entry: EventEntry) {
    setEditing(entry)
    setDeviceId(entry.device_id)
    setDisplayName(entry.display_name)
    setBibNo(entry.bib_no ?? "")
    setCategory(entry.category ?? "")
    setLinkedUser(
      entry.user_id
        ? { id: entry.user_id, nickname: entry.user_nickname ?? "" }
        : null,
    )
    setMemberQuery("")
    setMemberResults([])
    setFormOpen(true)
  }

  async function searchMembers() {
    if (!memberQuery.trim()) return
    try {
      setMemberResults(await trackerControlRepo.searchMembers(memberQuery))
    } catch {
      toast.error("회원 검색에 실패했어요.")
    }
  }

  async function handleSave() {
    if (!deviceId) {
      toast.error("기기를 선택해 주세요.")
      return
    }
    if (!displayName.trim()) {
      toast.error("참가자 이름을 입력해 주세요.")
      return
    }
    setSaving(true)
    try {
      await trackerControlRepo.upsertEntry({
        id: editing?.id ?? null,
        event_id: eventId,
        device_id: deviceId,
        display_name: displayName.trim(),
        bib_no: bibNo.trim() || null,
        category: category.trim() || null,
        user_id: linkedUser?.id ?? null,
      })
      toast.success(editing ? "참가자를 수정했어요." : "참가자를 등록했어요.")
      setFormOpen(false)
      reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장에 실패했어요.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await trackerControlRepo.deleteEntry(deleteTarget.id)
      toast.success("참가자를 삭제했어요.")
      setDeleteTarget(null)
      reload()
    } catch {
      toast.error("삭제에 실패했어요.")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          트래커 기기를 참가자 이름표로 등록해요. 앱 계정 연결은 선택이에요.
        </p>
        <Button
          size="sm"
          onClick={openCreate}
          className="bg-[#DC2F55] text-white hover:bg-[#DC2F55]/90"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          참가자 추가
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>배번</TableHead>
              <TableHead>이름</TableHead>
              <TableHead>구분</TableHead>
              <TableHead>기기</TableHead>
              <TableHead>연결 계정</TableHead>
              <TableHead>최근 수신</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries === null && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  불러오는 중…
                </TableCell>
              </TableRow>
            )}
            {entries?.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  아직 참가자가 없어요.
                </TableCell>
              </TableRow>
            )}
            {entries?.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="tabular-nums">
                  {e.bib_no ?? "—"}
                </TableCell>
                <TableCell className="font-medium">{e.display_name}</TableCell>
                <TableCell>
                  {e.category ? (
                    <Badge variant="secondary">{e.category}</Badge>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm">{e.label ?? e.imei}</span>
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    …{e.imei.slice(-4)}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {e.user_id ? (
                    <Link
                      href={`/athlete/${e.user_id}`}
                      className="underline-offset-4 hover:text-foreground hover:underline"
                      title="업적 보기"
                    >
                      {e.user_nickname ?? "계정"}
                    </Link>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {timeAgo(e.last_seen_at)}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(e)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-red-500"
                      onClick={() => setDeleteTarget(e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 등록/수정 다이얼로그 */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "참가자 수정" : "참가자 추가"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>기기</Label>
              <Select value={deviceId} onValueChange={setDeviceId}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      devices === null ? "불러오는 중…" : "기기 선택"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {selectableDevices.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.label ?? d.imei}{" "}
                      <span className="text-muted-foreground">
                        …{d.imei.slice(-4)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectableDevices.length === 0 && devices !== null && (
                <p className="text-xs text-muted-foreground">
                  배정 가능한 기기가 없어요.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="entry-name">이름</Label>
              <Input
                id="entry-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="참가자 이름"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="entry-bib">배번</Label>
                <Input
                  id="entry-bib"
                  value={bibNo}
                  onChange={(e) => setBibNo(e.target.value)}
                  placeholder="예: 101"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="entry-category">구분</Label>
                <Input
                  id="entry-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="예: 남자"
                  list="entry-category-options"
                />
                <datalist id="entry-category-options">
                  {existingCategories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </div>
            <div className="space-y-2">
              <Label>앱 계정 연결 (선택)</Label>
              {linkedUser ? (
                <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>{linkedUser.nickname || "연결된 계정"}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setLinkedUser(null)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <Input
                      value={memberQuery}
                      onChange={(e) => setMemberQuery(e.target.value)}
                      placeholder="닉네임 검색"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          searchMembers()
                        }
                      }}
                    />
                    <Button variant="outline" size="icon" onClick={searchMembers}>
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                  {memberResults.length > 0 && (
                    <div className="max-h-32 overflow-y-auto rounded-md border">
                      {memberResults.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          className="block w-full px-3 py-1.5 text-left text-sm hover:bg-accent"
                          onClick={() => {
                            setLinkedUser(m)
                            setMemberResults([])
                          }}
                        >
                          {m.nickname}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#DC2F55] text-white hover:bg-[#DC2F55]/90"
            >
              {saving ? "저장 중…" : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>참가자를 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.display_name} 참가자를 이벤트에서 제외해요. 기기와
              위치 기록은 삭제되지 않아요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
