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
    return NextResponse.json(
      {
        error:
          "No has iniciado sesión.",
      },
      {
        status: 401,
      }
    )
  }

  const { data: membership } =
    await supabaseAdmin
      .from("memberships")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .gt(
        "expires_at",
        new Date().toISOString()
      )
      .order("expires_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle()

  if (!membership) {
    return NextResponse.json(
      {
        error:
          "No tienes una membresía VIP activa.",
      },
      {
        status: 403,
      }
    )
  }

  let body: ChangePasswordBody

  try {
    body =
      (await request.json()) as
        ChangePasswordBody
  } catch {
    return NextResponse.json(
      {
        error:
          "La solicitud no es válida.",
      },
      {
        status: 400,
      }
    )
  }

  if (
    typeof body.currentPassword !==
      "string" ||
    typeof body.newPassword !==
      "string"
  ) {
    return NextResponse.json(
      {
        error:
          "Completa todos los campos.",
      },
      {
        status: 400,
      }
    )
  }

  const currentPassword =
    body.currentPassword

  const newPassword =
    body.newPassword

  if (!currentPassword) {
    return NextResponse.json(
      {
        error:
          "Ingresa tu contraseña actual.",
      },
      {
        status: 400,
      }
    )
  }

  if (
    newPassword.length <
      MINIMUM_PASSWORD_LENGTH ||
    newPassword.length >
      MAXIMUM_PASSWORD_LENGTH
  ) {
    return NextResponse.json(
      {
        error:
          "La nueva contraseña debe tener entre 12 y 24 caracteres.",
      },
      {
        status: 400,
      }
    )
  }

  if (
    newPassword ===
    currentPassword
  ) {
    return NextResponse.json(
      {
        error:
          "La nueva contraseña debe ser diferente a la actual.",
      },
      {
        status: 400,
      }
    )
  }

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
      .eq("user_id", user.id)
      .maybeSingle()

  if (limitsError) {
    return NextResponse.json(
      {
        error:
          "No pudimos comprobar cuándo cambiaste tu contraseña.",
      },
      {
        status: 500,
      }
    )
  }

  const nextChangeAt =
    getNextChangeAt(
      limits?.password_changed_at ??
        null
    )

  if (
    nextChangeAt &&
    nextChangeAt.getTime() >
      Date.now()
  ) {
    return NextResponse.json(
      {
        error:
          "Todavía no puedes volver a cambiar tu contraseña.",

        nextChangeAt:
          nextChangeAt.toISOString(),
      },
      {
        status: 429,
      }
    )
  }

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
    return NextResponse.json(
      {
        error:
          "La contraseña actual no es correcta.",
      },
      {
        status: 400,
      }
    )
  }

  const {
    error: updatePasswordError,
  } =
    await supabaseAdmin
      .auth.admin
      .updateUserById(
        user.id,
        {
          password:
            newPassword,
        }
      )

  if (updatePasswordError) {
    return NextResponse.json(
      {
        error:
          "No pudimos cambiar tu contraseña. Inténtalo nuevamente.",
      },
      {
        status: 500,
      }
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
    return NextResponse.json(
      {
        error:
          "La contraseña cambió, pero no pudimos registrar el tiempo de espera.",
      },
      {
        status: 500,
      }
    )
  }

  const nextAllowedChange =
    new Date(
      new Date(
        changedAt
      ).getTime() +
        CHANGE_COOLDOWN_MS
    ).toISOString()

  return NextResponse.json({
    success: true,

    nextChangeAt:
      nextAllowedChange,
  })
}