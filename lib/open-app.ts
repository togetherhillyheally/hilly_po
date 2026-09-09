// 앱 딥링크 열기 — hilly_home lib/open-app.ts 와 동일 로직 (prod 스킴/패키지 유지).
export const APP_SCHEME = "hillyheally"
export const ANDROID_PACKAGE = "com.hillyheally.app"
export const APP_STORE_URL =
  "https://apps.apple.com/kr/app/hillyheally/id6749788761"
export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.hillyheally.app&hl=ko"

export type Platform = "ios" | "android" | "other"

export function detectPlatform(ua: string): Platform {
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios"
  if (/Android/i.test(ua)) return "android"
  return "other"
}

/**
 * 앱 열기 시도. path 예: "t/<trailId>"
 * - Android: intent:// — 미설치 시 스토어 폴백
 * - iOS: 커스텀 스킴 — 미설치 시 시스템 알럿 후 페이지 유지
 * - 데스크톱: App Store 페이지 새 탭
 */
export function attemptOpenApp(path: string, platform: Platform) {
  if (platform === "android") {
    window.location.href = `intent://${path}#Intent;scheme=${APP_SCHEME};package=${ANDROID_PACKAGE};S.browser_fallback_url=${encodeURIComponent(PLAY_STORE_URL)};end`
    return
  }
  if (platform === "ios") {
    window.location.href = `${APP_SCHEME}://${path}`
    return
  }
  window.open(APP_STORE_URL, "_blank")
}
