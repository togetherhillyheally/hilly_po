import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

type CookieToSet = { name: string; value: string; options?: CookieOptions }

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // /control 은 공개 보기(게스트 가능) — 설정 화면(빠른 관제·전체 기기)만 로그인 필요
  const loginOnly =
    pathname.startsWith("/maps") ||
    pathname.startsWith("/control/quick") ||
    pathname.startsWith("/control/devices")
  if (!user && loginOnly) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone()
    url.pathname = "/maps"
    url.search = ""
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  // /watch 는 공개 관전 페이지 — 의도적으로 matcher 에서 제외 (비로그인 접근 허용)
  matcher: ["/maps/:path*", "/control/:path*", "/login"],
}
