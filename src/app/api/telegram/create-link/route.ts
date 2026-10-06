import { randomBytes } from "node:crypto"

import { NextResponse } from "next/server"

import { supabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const LINK_DURATION_MS =
  10 * 60 * 1000

const DEFAULT_MAINTENANCE_MESSAGE =
  "The Golden Circle se encuentra temporalmente en mantenimiento."

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
          "no-store, no-cache, must-revalidate",
      },
    }
  )
}

export async function POST() {
  try {
    const supabase =
      await createClient()

    const {
      data: { user },
    } =
      await supabase.auth.getUser()

    if (!user) {
      return json(
        {
          ok: false,
          error:
            "Debes iniciar sesión.",
        },
        401
      )
    }

    /*
     * Antes de hacer cualquier
     * operación de Telegram,
     * comprobamos si el servicio
     * está en mantenimiento.
     */
    const {
      data: telegramServiceState,
      error: telegramServiceStateError,
    } =
      await supabaseAdmin
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
        .maybeSingle()

    if (
      telegramServiceStateError
    ) {
      console.error(
        "Error consultando estado de mantenimiento de Telegram:",
        telegramServiceStateError
      )

      /*
       * Si no podemos comprobar
       * el estado, bloqueamos el
       * acceso por seguridad.
       */
      return json(
        {
          ok: false,
          error:
            "No se pudo comprobar el estado de Telegram.",
        },
        503
      )
    }

    if (
      !telegramServiceState
    ) {
      console.error(
        "No existe telegram_service_state con id 1."
      )

      return json(
        {
          ok: false,
          error:
            "No se pudo comprobar el estado de Telegram.",
        },
        503
      )
    }

    if (
      telegramServiceState
        .maintenance === true
    ) {
      const maintenanceMessage =
        telegramServiceState
          .message
          ?.trim() ||
        DEFAULT_MAINTENANCE_MESSAGE

      return json(
        {
          ok: false,
          maintenance: true,
          error:
            maintenanceMessage,
        },
        503
      )
    }

    const now =
      new Date()

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
          now.toISOString()
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
      console.error(
        "Error consultando membresía para Telegram:",
        membershipError
      )

      return json(
        {
          ok: false,
          error:
            "No se pudo comprobar tu membresía.",
        },
        500
      )
    }

    if (!membership) {
      return json(
        {
          ok: false,
          error:
            "Necesitas una membresía VIP activa.",
        },
        403
      )
    }

    const botUsername =
      process.env
        .TELEGRAM_BOT_USERNAME
        ?.trim()
        .replace(/^@/, "")

    if (!botUsername) {
      console.error(
        "Falta TELEGRAM_BOT_USERNAME."
      )

      return json(
        {
          ok: false,
          error:
            "Telegram no está configurado.",
        },
        500
      )
    }

    const membershipExpiresAt =
      new Date(
        membership.expires_at
      ).getTime()

    const tokenExpiresAt =
      Math.min(
        now.getTime() +
          LINK_DURATION_MS,
        membershipExpiresAt
      )

    if (
      Number.isNaN(
        tokenExpiresAt
      ) ||
      tokenExpiresAt <=
        now.getTime()
    ) {
      return json(
        {
          ok: false,
          error:
            "Tu membresía VIP ya no está activa.",
        },
        403
      )
    }

    /*
     * Eliminamos cualquier token
     * anterior que todavía no haya
     * sido utilizado.
     */
    const {
      error: deleteError,
    } =
      await supabaseAdmin
        .from(
          "telegram_link_tokens"
        )
        .delete()
        .eq(
          "user_id",
          user.id
        )
        .is(
          "used_at",
          null
        )

    if (deleteError) {
      console.error(
        "Error limpiando tokens de Telegram:",
        deleteError
      )

      return json(
        {
          ok: false,
          error:
            "No se pudo preparar Telegram.",
        },
        500
      )
    }

    const token =
      randomBytes(24)
        .toString(
          "base64url"
        )

    const expiresAt =
      new Date(
        tokenExpiresAt
      ).toISOString()

    const {
      error: tokenError,
    } =
      await supabaseAdmin
        .from(
          "telegram_link_tokens"
        )
        .insert({
          token,
          user_id:
            user.id,
          membership_id:
            String(
              membership.id
            ),
          expires_at:
            expiresAt,
          used_at:
            null,
        })

    if (tokenError) {
      console.error(
        "Error creando token de Telegram:",
        tokenError
      )

      return json(
        {
          ok: false,
          error:
            "No se pudo preparar Telegram.",
        },
        500
      )
    }

    const url =
      `https://t.me/${botUsername}?start=${token}`

    return json({
      ok: true,
      url,
      expiresAt,
    })
  } catch (error) {
    console.error(
      "Error inesperado creando enlace de Telegram:",
      error
    )

    return json(
      {
        ok: false,
        error:
          "No se pudo preparar Telegram.",
      },
      500
    )
  }
}