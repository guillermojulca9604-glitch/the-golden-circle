import { redirect } from "next/navigation"

import { supabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { LoginClient } from "./login-client"

type Props = {
  searchParams: Promise<{
    next?: string
    oauth_error?: string
  }>
}

function getSafeNextPath(
  value: string | undefined
) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return "/entry"
  }

  return value
}

function getOAuthErrorMessage(
  errorCode: string | undefined
) {
  switch (errorCode) {
    case "access_denied":
      return "Cancelaste el acceso con Google."

    case "provider_error":
      return "Google no pudo completar el acceso."

    case "missing_code":
    case "exchange_failed":
      return "No pudimos completar el inicio de sesión con Google."

    case "membership_check_failed":
      return "La cuenta se conectó, pero no pudimos comprobar tu membresía."

    default:
      return ""
  }
}

export const dynamic =
  "force-dynamic"

export default async function LoginPage({
  searchParams,
}: Props) {
  const params =
    await searchParams

  const nextPath =
    getSafeNextPath(
      params.next
    )

  const errorReturnPath =
    "/login" +
    `?next=${encodeURIComponent(
      nextPath
    )}`

  const supabase =
    await createClient()

  const {
    data: { user },
  } =
    await supabase.auth.getUser()

  if (user) {
    const adminEmail =
      process.env.ADMIN_EMAIL
        ?.trim()
        .toLowerCase()

    if (
      adminEmail &&
      user.email?.toLowerCase() ===
        adminEmail
    ) {
      redirect("/admin")
    }

    const {
      data: membership,
    } =
      await supabaseAdmin
        .from("memberships")
        .select("id")
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "status",
          "active"
        )
        .gt(
          "expires_at",
          new Date().toISOString()
        )
        .order(
          "expires_at",
          {
            ascending: false,
          }
        )
        .limit(1)
        .maybeSingle()

    if (membership) {
      redirect("/vip")
    }

    redirect(nextPath)
  }

  return (
    <LoginClient
      nextPath={nextPath}
      errorReturnPath={
        errorReturnPath
      }
      oauthErrorMessage={
        getOAuthErrorMessage(
          params.oauth_error
        )
      }
    />
  )
}