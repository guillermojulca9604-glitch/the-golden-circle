import { redirect } from "next/navigation"

import { supabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { SubscriptionAccessClient } from "./subscription-access-client"

type Plan =
  | "monthly"
  | "quarterly"

type Props = {
  searchParams: Promise<{
    plan?: string
    oauth_error?: string
  }>
}

function getOAuthErrorMessage(
  errorCode: string | undefined
) {
  switch (errorCode) {
    case "access_denied":
      return "Cancelaste el acceso con Google."

    case "provider_error":
      return "Google no pudo completar el registro."

    case "missing_code":
    case "exchange_failed":
      return "No pudimos completar el registro con Google."

    case "membership_check_failed":
      return "La cuenta se conectó, pero no pudimos comprobar tu membresía."

    default:
      return ""
  }
}

export const dynamic =
  "force-dynamic"

export default async function SubscriptionAccessPage({
  searchParams,
}: Props) {
  const params =
    await searchParams

  const plan: Plan =
    params.plan === "quarterly"
      ? "quarterly"
      : "monthly"

  const supabase =
    await createClient()

  const {
    data: { user },
  } =
    await supabase.auth.getUser()

  if (user) {
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

    redirect(
      `/checkout?plan=${plan}`
    )
  }

  return (
    <SubscriptionAccessClient
      plan={plan}
      oauthErrorMessage={
        getOAuthErrorMessage(
          params.oauth_error
        )
      }
    />
  )
}