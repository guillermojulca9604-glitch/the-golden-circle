import { redirect } from "next/navigation"

import { VipBackground } from "./components/vip-background"

import { supabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

const CHANGE_COOLDOWN_DAYS = 7

const CHANGE_COOLDOWN_MS =
  CHANGE_COOLDOWN_DAYS *
  24 *
  60 *
  60 *
  1000

type ChangeLimit = {
  canChange: boolean
  nextChangeAt: string | null
}

type AccountLimits = {
  username: ChangeLimit
  password: ChangeLimit
}

type AuthUser = {
  app_metadata?: Record<
    string,
    unknown
  >
  identities?: Array<{
    provider?: string
  }> | null
}

function readProfileName(
  metadata: Record<string, unknown>
) {
  const profileName =
    metadata.profile_name

  if (
    typeof profileName === "string" &&
    profileName.trim()
  ) {
    return profileName.trim()
  }

  const username =
    metadata.username

  if (
    typeof username === "string" &&
    username.trim()
  ) {
    return username.trim()
  }

  return ""
}

function userHasEmailPasswordProvider(
  user: AuthUser
) {
  const providers =
    user.app_metadata
      ?.providers

  if (
    Array.isArray(providers) &&
    providers.includes("email")
  ) {
    return true
  }

  if (
    user.app_metadata
      ?.provider === "email"
  ) {
    return true
  }

  return (
    user.identities?.some(
      (identity) =>
        identity.provider ===
        "email"
    ) ?? false
  )
}

function createChangeLimit(
  changedAt: string | null
): ChangeLimit {
  if (!changedAt) {
    return {
      canChange: true,
      nextChangeAt: null,
    }
  }

  const changedAtTime =
    new Date(changedAt).getTime()

  if (
    Number.isNaN(changedAtTime)
  ) {
    return {
      canChange: true,
      nextChangeAt: null,
    }
  }

  const nextChangeDate =
    new Date(
      changedAtTime +
        CHANGE_COOLDOWN_MS
    )

  return {
    canChange:
      nextChangeDate.getTime() <=
      Date.now(),

    nextChangeAt:
      nextChangeDate.toISOString(),
  }
}

export default async function VipPage() {
  const supabase =
    await createClient()

  const {
    data: { user },
  } =
    await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  const {
    data: membership,
    error: membershipError,
  } =
    await supabaseAdmin
      .from("memberships")
      .select(
        "id, expires_at"
      )
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

  if (membershipError) {
    throw new Error(
      "No se pudo consultar la membresía."
    )
  }

  if (!membership) {
    redirect(
      "/access?step=pricing"
    )
  }

  const metadata =
    user.user_metadata &&
    typeof user.user_metadata ===
      "object"
      ? (
          user.user_metadata as Record<
            string,
            unknown
          >
        )
      : {}

  const profileName =
    readProfileName(metadata)

  if (!profileName) {
    redirect("/vip/profile")
  }

  const accountEmail =
    user.email?.trim() ?? ""

  const {
    data: storedLimits,
    error: limitsError,
  } =
    await supabaseAdmin
      .from(
        "user_account_change_limits"
      )
      .select(
        "username_changed_at, password_changed_at"
      )
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle()

  if (limitsError) {
    throw new Error(
      "No se pudieron consultar los límites de la cuenta."
    )
  }

  const accountLimits: AccountLimits = {
    username:
      createChangeLimit(
        storedLimits
          ?.username_changed_at ??
          null
      ),

    password:
      createChangeLimit(
        storedLimits
          ?.password_changed_at ??
          null
      ),
  }

  const hasPassword =
    userHasEmailPasswordProvider(
      user
    ) ||
    Boolean(
      storedLimits
        ?.password_changed_at
    )

  return (
    <VipBackground
      accountName={profileName}
      accountEmail={accountEmail}
      membershipExpiresAt={
        membership.expires_at ??
        ""
      }
      accountLimits={accountLimits}
      initialHasPassword={
        hasPassword
      }
    />
  )
}