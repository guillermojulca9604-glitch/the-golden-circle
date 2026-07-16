import { createServerClient } from "@supabase/ssr"
import {
  NextResponse,
  type NextRequest,
} from "next/server"

const PRIVATE_PREFIXES = [
  "/vip",
  "/admin",
  "/pricing",
  "/checkout",
  "/payment-success",
  "/payment-pending",
]

const PRIVATE_ACCESS_STEPS = new Set([
  "pricing",
  "checkout",
  "vip",
])

function isPrivateRequest(
  request: NextRequest
) {
  const {
    pathname,
    searchParams,
  } = request.nextUrl

  if (
    PRIVATE_PREFIXES.some((prefix) =>
      pathname.startsWith(prefix)
    )
  ) {
    return true
  }

  return (
    pathname === "/access" &&
    PRIVATE_ACCESS_STEPS.has(
      searchParams.get("step") ?? ""
    )
  )
}

function copyResponseCookies(
  from: NextResponse,
  to: NextResponse
) {
  from.cookies
    .getAll()
    .forEach((cookie) => {
      to.cookies.set(cookie)
    })
}

export async function updateSession(
  request: NextRequest
) {
  let response =
    NextResponse.next({
      request,
    })

  const supabase =
    createServerClient(
      process.env
        .NEXT_PUBLIC_SUPABASE_URL!,
      process.env
        .NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },

          setAll(cookiesToSet) {
            cookiesToSet.forEach(
              ({
                name,
                value,
              }) => {
                request.cookies.set(
                  name,
                  value
                )
              }
            )

            response =
              NextResponse.next({
                request,
              })

            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) => {
                response.cookies.set(
                  name,
                  value,
                  options
                )
              }
            )
          },
        },
      }
    )

  const {
    data: { user },
  } =
    await supabase.auth.getUser()

  if (
    !user &&
    isPrivateRequest(request)
  ) {
    const url =
      request.nextUrl.clone()

    url.pathname = "/"
    url.search = ""

    const redirectResponse =
      NextResponse.redirect(url)

    copyResponseCookies(
      response,
      redirectResponse
    )

    redirectResponse.headers.set(
      "Cache-Control",
      "no-store"
    )

    return redirectResponse
  }

  return response
}