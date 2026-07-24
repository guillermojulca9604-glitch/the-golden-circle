import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { supabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

const MINIMUM_PASSWORD_LENGTH =
  12

const MAXIMUM_PASSWORD_LENGTH =
  24

const PASSWORD_RECOVERY_COOKIE =
  "golden_circle_password_recovery"

type ResetPasswordBody = {
  password?: unknown
}

function json(
  body: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(
    body,
    {
      status,

      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate, max-age=0",
      },
    }
  )
}

export async function POST(
  request: Request
) {
  const cookieStore =
    await cookies()

  const recoveryAllowed =
    cookieStore.get(
      PASSWORD_RECOVERY_COOKIE
    )?.value === "1"

  if (!recoveryAllowed) {
    return json(
      {
        success: false,

        error:
          "El enlace de recuperación ya no es válido. Solicita uno nuevo.",
      },
      401
    )
  }

  let body:
    ResetPasswordBody

  try {
    body =
      (await request.json()) as
        ResetPasswordBody
  } catch {
    return json(
      {
        success: false,

        error:
          "La solicitud no es válida.",
      },
      400
    )
  }

  const password =
    typeof body.password ===
    "string"
      ? body.password
      : ""

  if (
    password.length <
      MINIMUM_PASSWORD_LENGTH ||
    password.length >
      MAXIMUM_PASSWORD_LENGTH
  ) {
    return json(
      {
        success: false,

        error:
          "La contraseña debe tener entre 12 y 24 caracteres.",
      },
      400
    )
  }

  const supabase =
    await createClient()

  const {
    data: {
      user,
    },

    error:
      userError,
  } =
    await supabase.auth.getUser()

  if (
    userError ||
    !user
  ) {
    return json(
      {
        success: false,

        error:
          "El enlace de recuperación ya no es válido. Solicita uno nuevo.",
      },
      401
    )
  }

  /*
   * Guardamos el límite anterior para
   * poder restaurarlo si Supabase no
   * cambia la contraseña.
   */
  const {
    data:
      previousLimit,

    error:
      previousLimitError,
  } =
    await supabaseAdmin
      .from(
        "user_account_change_limits"
      )
      .select(
        "password_changed_at, updated_at"
      )
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle()

  if (previousLimitError) {
    return json(
      {
        success: false,

        error:
          "No pudimos preparar el cambio de contraseña.",
      },
      500
    )
  }

  const changedAt =
    new Date().toISOString()

  /*
   * La recuperación no revisa el límite
   * de siete días.
   *
   * Solamente registra una nueva fecha
   * para reiniciar el bloqueo del cambio
   * manual dentro de Mi cuenta.
   */
  const {
    error:
      limitUpdateError,
  } =
    await supabaseAdmin
      .from(
        "user_account_change_limits"
      )
      .upsert(
        {
          user_id:
            user.id,

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

  if (limitUpdateError) {
    return json(
      {
        success: false,

        error:
          "No pudimos preparar el cambio de contraseña.",
      },
      500
    )
  }

  const {
    error:
      passwordUpdateError,
  } =
    await supabase.auth
      .updateUser({
        password,
      })

  if (passwordUpdateError) {
    /*
     * La contraseña no cambió:
     * restauramos el límite anterior.
     */
    if (previousLimit) {
      await supabaseAdmin
        .from(
          "user_account_change_limits"
        )
        .update({
          password_changed_at:
            previousLimit
              .password_changed_at,

          updated_at:
            previousLimit
              .updated_at,
        })
        .eq(
          "user_id",
          user.id
        )
    } else {
      await supabaseAdmin
        .from(
          "user_account_change_limits"
        )
        .delete()
        .eq(
          "user_id",
          user.id
        )
    }

    return json(
      {
        success: false,

        error:
          "No pudimos actualizar la contraseña. Solicita un enlace nuevo.",
      },
      400
    )
  }

  /*
   * Cerramos únicamente la sesión
   * temporal utilizada en este navegador.
   */
  await supabase.auth.signOut({
    scope: "local",
  })

  const response =
    json({
      success: true,

      passwordChangedAt:
        changedAt,
    })

  response.cookies.delete(
    PASSWORD_RECOVERY_COOKIE
  )

  return response
}