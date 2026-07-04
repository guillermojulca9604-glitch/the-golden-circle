import { NextResponse, type NextRequest } from "next/server"

const protectedRoutes = ["/access", "/vip", "/admin"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  )

  if (!isProtectedRoute) {
    return NextResponse.next()
  }

  const hasSupabaseSession = request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-"))

  if (!hasSupabaseSession && pathname !== "/access") {
    const url = request.nextUrl.clone()
    url.pathname = "/access"
    url.search = "?step=login"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/access/:path*", "/vip/:path*", "/admin/:path*"],
}