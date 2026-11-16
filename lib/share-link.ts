/**
 * 링크 공유 — 폰(카카오톡·문자 등 시스템 공유 시트)은 navigator.share, 없으면 클립보드 복사.
 * 반환값으로 호출부가 안내 문구를 고른다 (shared 면 시스템이 이미 보여줘서 토스트 불필요).
 */
export type ShareResult = "shared" | "copied" | "cancelled" | "failed"

export async function shareLink(url: string, title: string): Promise<ShareResult> {
  if (typeof navigator === "undefined") return "failed"
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title, url })
      return "shared"
    } catch (e) {
      // 사용자가 공유 시트를 닫은 것 — 복사로 넘어가지 않는다
      if ((e as Error)?.name === "AbortError") return "cancelled"
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    return "copied"
  } catch {
    return "failed"
  }
}
