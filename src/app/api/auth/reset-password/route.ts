import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { supabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

const MINIMUM_PASSWORD_LENGTH = 12
const MAXIMUM_PASSWORD_LENGTH = 24

const PASSWORD_RECOVERY_COOKIE =
  "golden_circle_password_recovery"

type ResetPasswordBody = {
  password?: unknown
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control":
        "no-store, no-cache, must-revalidate, max-age=0",
    },
  })
}

export async function POST(request: Request) {
  const cookieStore = await cookies()

  const recoveryAllowed =
    cookieStore.get(
      PASSWORD_RECOVERY_COOKIE
    )?.value === "1"

  if (!recoveryAllowed) {
    return jsonResponse(
      {
        success: false,
        error:
          "El enlace de recuperación ya no es válido. Solicita uno nuevo.",
      },
      401
    )
  }

  let body: ResetPasswordBody

  try {
    body =
      (await request.json()) as ResetPasswordBody
  } catch {
    return jsonResponse(
      {
        success: false,
        error: "La solicitud no es válida.",
      },
      400
    )
  }

  const password =
    typeof body.password === "string"
      ? body.password
      : ""

  if (
    password.length <
      MINIMUM_PASSWORD_LENGTH ||
    password.length >
      MAXIMUM_PASSWORD_LENGTH
  ) {
    return jsonResponse(
      {
        success: false,
        error:
          "La contraseña debe tener entre 12 y 24 caracteres.",
      },
      400
    )
  }

  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return jsonResponse(
      {
        success: false,
        error:
          "El enlace de recuperación ya no es válido. Solicita uno nuevo.",
      },
      401
    )
  }

  const {
    data: previousLimit,
    error: previousLimitError,
  } = await supabaseAdmin
    .from("user_account_change_limits")
    .select(
      "password_changed_at, updated_at"
    )
    .eq("user_id", user.id)
    .maybeSingle()

  if (previousLimitError) {
    console.error(
      "Could not read previous password limit:",
      previousLimitError
    )

    return jsonResponse(
      {
        success: false,
        error:
          "No se pudo preparar el cambio de contraseña.",
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
   * Registra una fecha nueva para que el
   * cambio manual desde Mi cuenta vuelva
   * a quedar bloqueado durante siete días.
   */
  const { error: limitUpdateError } =
    await supabaseAdmin
      .from(
        "user_account_change_limits"
      )
      .upsert(
        {
          user_id: user.id,
          password_changed_at:
            changedAt,
          updated_at: changedAt,
        },
        {
          onConflict: "user_id",
        }
      )

  if (limitUpdateError) {
    console.error(
      "Could not update password limit:",
      limitUpdateError
    )

    return jsonResponse(
      {
        success: false,
        error:
          "No se pudo preparar el cambio de contraseña.",
      },
      500
    )
  }

  /*
   * updateUser usa la sesión de recuperación
   * creada cuando se validó el enlace.
   */
  const {
    error: passwordUpdateError,
  } = await supabase.auth.updateUser({
    password,
  })

  if (passwordUpdateError) {
    console.error(
      "Could not update recovered password:",
      passwordUpdateError
    )

    /*
     * La contraseña no cambió, por lo que
     * restauramos el límite anterior.
     */
    if (previousLimit) {
      const { error: rollbackError } =
        await supabaseAdmin
          .from(
            "user_account_change_limits"
          )
          .update({
            password_changed_at:
              previousLimit.password_changed_at,
            updated_at:
              previousLimit.updated_at,
          })
          .eq("user_id", user.id)

      if (rollbackError) {
        console.error(
          "Could not restore previous password limit:",
          rollbackError
        )
      }
    } else {
      const { error: rollbackError } =
        await supabaseAdmin
          .from(
            "user_account_change_limits"
          )
          .delete()
          .eq("user_id", user.id)

      if (rollbackError) {
        console.error(
          "Could not remove password limit:",
          rollbackError
        )
      }
    }

    return jsonResponse(
      {
        success: false,
        error:
          "No se pudo actualizar la contraseña. Solicita un enlace nuevo.",
      },
      400
    )
  }

  /*
   * Cerramos la sesión temporal utilizada
   * para recuperar la contraseña.
   */
  const { error: signOutError } =
    await supabase.auth.signOut({
      scope: "local",
    })

  if (signOutError) {
    console.error(
      "Could not close recovery session:",
      signOutError
    )
  }

  const response = jsonResponse({
    success: true,
    passwordChangedAt: changedAt,
  })

  response.cookies.delete(
    PASSWORD_RECOVERY_COOKIE
  )

  return response
}