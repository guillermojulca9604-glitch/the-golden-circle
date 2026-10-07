import { redirect } from "next/navigation"

import { VipHome } from "./components/home/vip-home"
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

const DEFAULT_TELEGRAM_MAINTENANCE_MESSAGE =
  "The Golden Circle se encuentra temporalmente en mantenimiento."

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

type TelegramServiceState = {
  maintenance: boolean
  message: string
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

  /*
   * Todo esto se consulta desde el
   * servidor antes de mostrar /vip.
   *
   * Así Telegram no necesita hacer
   * una segunda consulta después
   * de que la página aparezca.
   */
  const [
    storedLimitsResult,
    telegramLinkResult,
    telegramServiceStateResult,
  ] =
    await Promise.all([
      supabaseAdmin
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
        .maybeSingle(),

      supabaseAdmin
        .from(
          "telegram_links"
        )
        .select(
          "telegram_user_id, telegram_username, linked_at"
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle(),

      supabaseAdmin
        .from(
          "telegram_service_state"
        )
        .select(
          "maintenance, message"
        )
        .eq(
          "id",
          1
        )
        .maybeSingle(),
    ])

  const {
    data: storedLimits,
    error: limitsError,
  } =
    storedLimitsResult

  if (limitsError) {
    throw new Error(
      "No se pudieron consultar los límites de la cuenta."
    )
  }

  const {
    data: telegramLink,
    error: telegramLinkError,
  } =
    telegramLinkResult

  if (telegramLinkError) {
    console.error(
      "No se pudo consultar Telegram:",
      telegramLinkError
    )
  }

  const {
    data:
      telegramServiceStateData,
    error:
      telegramServiceStateError,
  } =
    telegramServiceStateResult

  if (
    telegramServiceStateError
  ) {
    console.error(
      "No se pudo consultar el estado de mantenimiento de Telegram:",
      telegramServiceStateError
    )
  }

  /*
   * Si por algún problema no se puede
   * comprobar el estado de Telegram,
   * cerramos únicamente Telegram por
   * seguridad.
   *
   * El resto del VIP sigue funcionando.
   */
  const telegramServiceState:
    TelegramServiceState =
    telegramServiceStateData
      ? {
          maintenance:
            telegramServiceStateData
              .maintenance ===
            true,

          message:
            typeof telegramServiceStateData
              .message ===
              "string" &&
            telegramServiceStateData
              .message
              .trim()
              ? telegramServiceStateData
                  .message
                  .trim()
              : DEFAULT_TELEGRAM_MAINTENANCE_MESSAGE,
        }
      : {
          maintenance:
            true,

          message:
            DEFAULT_TELEGRAM_MAINTENANCE_MESSAGE,
        }

  const telegramLinked =
    Boolean(
      telegramLink
        ?.telegram_user_id
    ) &&
    Boolean(
      telegramLink
        ?.linked_at
    )

  const telegramUsername =
    telegramLinked &&
    typeof telegramLink
      ?.telegram_username ===
      "string" &&
    telegramLink.telegram_username.trim()
      ? telegramLink.telegram_username.trim()
      : null

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
      initialTelegramLinked={
        telegramLinked
      }
      initialTelegramUsername={
        telegramUsername
      }
    >
      <VipHome
        accountName={profileName}
        continueWatching={null}
        latestVideos={[]}
        popularVideos={[]}
        initialTelegramMaintenance={
          telegramServiceState
            .maintenance
        }
        telegramMaintenanceMessage={
          telegramServiceState
            .message
        }
      />
    </VipBackground>
  )
}