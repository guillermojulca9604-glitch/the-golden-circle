import {
  createClient as createVerificationClient,
} from "@supabase/supabase-js"

import { NextResponse } from "next/server"

import { supabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

const MINIMUM_PASSWORD_LENGTH = 12
const MAXIMUM_PASSWORD_LENGTH = 24

const CHANGE_COOLDOWN_DAYS = 7

const CHANGE_COOLDOWN_MS =
  CHANGE_COOLDOWN_DAYS *
  24 *
  60 *
  60 *
  1000

type ChangePasswordBody = {
  currentPassword?: unknown
  newPassword?: unknown
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

function json(
  body: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control":
        "no-store, max-age=0",
    },
  })
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

function getNextChangeAt(
  changedAt: string | null
) {
  if (!changedAt) {
    return null
  }

  const changedTime =
    new Date(changedAt).getTime()

  if (Number.isNaN(changedTime)) {
    return null
  }

  return new Date(
    changedTime +
      CHANGE_COOLDOWN_MS
  )
}

async function findActiveMembership(
  userId: string
) {
  const {
    data: membership,
    error: membershipError,
  } =
    await supabaseAdmin
      .from("memberships")
      .select("id")
      .eq(
        "user_id",
        userId
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

  return {
    membership,
    membershipError,
  }
}

async function getPasswordChangedAt(
  userId: string
) {
  const {
    data: limits,
    error: limitsError,
  } =
    await supabaseAdmin
      .from(
        "user_account_change_limits"
      )
      .select(
        "password_changed_at"
      )
      .eq(
        "user_id",
        userId
      )
      .maybeSingle()

  return {
    passwordChangedAt:
      limits?.password_changed_at ??
      null,

    limitsError,
  }
}

export async function GET() {
  const supabase =
    await createClient()

  const {
    data: { user },
  } =
    await supabase.auth.getUser()

  if (
    !user ||
    !user.email
  ) {
    return json(
      {
        error:
          "No has iniciado sesión.",
      },
      401
    )
  }

  const {
    membership,
    membershipError,
  } =
    await findActiveMembership(
      user.id
    )

  if (membershipError) {
    return json(
      {
        error:
          "No pudimos comprobar tu membresía.",
      },
      500
    )
  }

  if (!membership) {
    return json(
      {
        error:
          "No tienes una membresía VIP activa.",
      },
      403
    )
  }

  const {
    passwordChangedAt,
    limitsError,
  } =
    await getPasswordChangedAt(
      user.id
    )

  if (limitsError) {
    return json(
      {
        error:
          "No pudimos comprobar la configuración de tu contraseña.",
      },
      500
    )
  }

  const hasPassword =
    userHasEmailPasswordProvider(
      user
    ) ||
    Boolean(passwordChangedAt)

  return json({
    hasPassword,
  })
}

export async function POST(
  request: Request
) {
  const supabase =
    await createClient()

  const {
    data: { user },
  } =
    await supabase.auth.getUser()

  if (
    !user ||
    !user.email
  ) {
    return json(
      {
        error:
          "No has iniciado sesión.",
      },
      401
    )
  }

  const {
    membership,
    membershipError,
  } =
    await findActiveMembership(
      user.id
    )

  if (membershipError) {
    return json(
      {
        error:
          "No pudimos comprobar tu membresía.",
      },
      500
    )
  }

  if (!membership) {
    return json(
      {
        error:
          "No tienes una membresía VIP activa.",
      },
      403
    )
  }

  let body: ChangePasswordBody

  try {
    body =
      (await request.json()) as
        ChangePasswordBody
  } catch {
    return json(
      {
        error:
          "La solicitud no es válida.",
      },
      400
    )
  }

  if (
    typeof body.newPassword !==
      "string"
  ) {
    return json(
      {
        error:
          "Ingresa la nueva contraseña.",
      },
      400
    )
  }

  const currentPassword =
    typeof body.currentPassword ===
      "string"
      ? body.currentPassword
      : ""

  const newPassword =
    body.newPassword

  if (
    newPassword.length <
      MINIMUM_PASSWORD_LENGTH ||
    newPassword.length >
      MAXIMUM_PASSWORD_LENGTH
  ) {
    return json(
      {
        error:
          "La nueva contraseña debe tener entre 12 y 24 caracteres.",
      },
      400
    )
  }

  const {
    passwordChangedAt,
    limitsError,
  } =
    await getPasswordChangedAt(
      user.id
    )

  if (limitsError) {
    return json(
      {
        error:
          "No pudimos comprobar cuándo cambiaste tu contraseña.",
      },
      500
    )
  }

  const hasPassword =
    userHasEmailPasswordProvider(
      user
    ) ||
    Boolean(passwordChangedAt)

  /*
   * Una cuenta que ya tiene contraseña
   * debe confirmar la contraseña actual.
   *
   * Una cuenta que solamente utiliza
   * Google puede crear su primera
   * contraseña sin este campo.
   */
  if (
    hasPassword &&
    !currentPassword
  ) {
    return json(
      {
        error:
          "Ingresa tu contraseña actual.",
      },
      400
    )
  }

  if (
    hasPassword &&
    newPassword ===
      currentPassword
  ) {
    return json(
      {
        error:
          "La nueva contraseña debe ser diferente a la actual.",
      },
      400
    )
  }

  const nextChangeAt =
    getNextChangeAt(
      passwordChangedAt
    )

  if (
    nextChangeAt &&
    nextChangeAt.getTime() >
      Date.now()
  ) {
    return json(
      {
        error:
          "Todavía no puedes volver a cambiar tu contraseña.",

        nextChangeAt:
          nextChangeAt.toISOString(),
      },
      429
    )
  }

  /*
   * Cuando ya existe una contraseña,
   * primero comprobamos que la actual
   * sea correcta.
   */
  if (hasPassword) {
    const verificationClient =
      createVerificationClient(
        process.env
          .NEXT_PUBLIC_SUPABASE_URL!,
        process.env
          .NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl:
              false,
          },
        }
      )

    const {
      error: verificationError,
    } =
      await verificationClient
        .auth
        .signInWithPassword({
          email: user.email,
          password:
            currentPassword,
        })

    if (verificationError) {
      return json(
        {
          error:
            "La contraseña actual no es correcta.",
        },
        400
      )
    }
  }

  /*
   * Si la cuenta solo utiliza Google,
   * añadimos una contraseña propia para
   * iniciar sesión mediante correo.
   *
   * Si ya tiene contraseña, conservamos
   * el proceso de cambio existente.
   */
  const updatePasswordResult =
    hasPassword
      ? await supabaseAdmin
          .auth.admin
          .updateUserById(
            user.id,
            {
              password:
                newPassword,
            }
          )
      : await supabase.auth
          .updateUser({
            password:
              newPassword,
          })

  if (updatePasswordResult.error) {
    return json(
      {
        error: hasPassword
          ? "No pudimos cambiar tu contraseña. Inténtalo nuevamente."
          : "No pudimos crear tu contraseña. Inténtalo nuevamente.",
      },
      500
    )
  }

  const changedAt =
    new Date().toISOString()

  const {
    error: updateLimitError,
  } =
    await supabaseAdmin
      .from(
        "user_account_change_limits"
      )
      .upsert(
        {
          user_id: user.id,

          password_changed_at:
            changedAt,

          updated_at:
            changedAt,
        },
        {
          onConflict:
            "user_id",
        }
      )

  if (updateLimitError) {
    return json(
      {
        error:
          "La contraseña se guardó, pero no pudimos registrar el tiempo de espera.",
      },
      500
    )
  }

  const nextAllowedChange =
    new Date(
      new Date(
        changedAt
      ).getTime() +
        CHANGE_COOLDOWN_MS
    ).toISOString()

  return json({
    success: true,
    hasPassword: true,
    created: !hasPassword,

    nextChangeAt:
      nextAllowedChange,
  })
}