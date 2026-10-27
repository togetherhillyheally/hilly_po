/** 신청서 임시저장 — 이 기기(브라우저)에만 남는다. 동의 체크는 저장하지 않는다.
 *  결제가 끝나면 지운다. 저장소가 막힌 환경(시크릿 창 등)에서도 폼은 그대로 동작해야 한다. */

const KEY = "hilly:route-gg-san:signup-draft:v1"

export type SignupDraft<P, F> = {
  party: P[]
  fields: F
  savedAt: number
}

export function loadDraft<P, F>(): SignupDraft<P, F> | null {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    const d = JSON.parse(raw) as SignupDraft<P, F>
    if (!Array.isArray(d.party) || d.party.length === 0 || !d.fields) return null
    return d
  } catch {
    return null
  }
}

export function saveDraft<P, F>(party: P[], fields: F) {
  try {
    const d: SignupDraft<P, F> = { party, fields, savedAt: Date.now() }
    window.localStorage.setItem(KEY, JSON.stringify(d))
  } catch {
    // 저장 실패는 무시 — 임시저장은 편의 기능
  }
}

export function clearDraft() {
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    // 무시
  }
}
