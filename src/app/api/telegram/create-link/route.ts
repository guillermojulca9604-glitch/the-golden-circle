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
     * ==================================
     * MANTENIMIENTO
     * ==================================
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

    /*
     * ==================================
     * VIP ACTIVO
     * ==================================
     */
    const {
      data: membership,
      error: membershipError,
    } =
      await supabaseAdmin
        .from(
          "memberships"
        )
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

    const membershipId =
      String(
        membership.id
      )

    /*
     * ==================================
     * UNA SOLA VINCULACIÓN POR VIP
     * ==================================
     *
     * START BOT = vinculación definitiva.
     *
     * Desde el momento en que este VIP
     * tiene un Telegram asociado, la web
     * no vuelve a generar otro /start.
     *
     * Da igual si:
     *
     * - todavía no entró al canal;
     * - ya entró;
     * - compartió el enlace;
     * - salió voluntariamente.
     */
    const {
      data: telegramLink,
      error: telegramLinkError,
    } =
      await supabaseAdmin
        .from(
          "telegram_links"
        )
        .select(
          "telegram_user_id,membership_id,linked_at"
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle()

    if (
      telegramLinkError
    ) {
      console.error(
        "Error comprobando vinculación de Telegram:",
        telegramLinkError
      )

      return json(
        {
          ok: false,
          error:
            "No se pudo comprobar tu cuenta de Telegram.",
        },
        500
      )
    }

    const sameVip =
      telegramLink
        ?.membership_id !=
        null &&
      String(
        telegramLink
          .membership_id
      ) ===
        membershipId

    const alreadyLinked =
      Boolean(
        sameVip &&
        (
          telegramLink
            ?.telegram_user_id !=
            null ||
          telegramLink
            ?.linked_at !=
            null
        )
      )

    if (alreadyLinked) {
      return json(
        {
          ok: false,
          linked: true,
          error:
            "Tu cuenta de Telegram ya está vinculada a este VIP.",
        },
        409
      )
    }

    const botUsername =
      process.env
        .TELEGRAM_BOT_USERNAME
        ?.trim()
        .replace(
          /^@/,
          ""
        )

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

    /*
     * ==================================
     * WEB → START BOT
     * ==================================
     *
     * ESTE es el único enlace
     * que dura 10 minutos.
     *
     * Si no llega a pulsar START BOT
     * durante ese tiempo, todavía
     * no existe vinculación y puede
     * volver a generar otro.
     */
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
     * Mientras todavía NO haya usado
     * START BOT, reemplazamos cualquier
     * token WEB → BOT anterior.
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
        .eq(
          "membership_id",
          membershipId
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
            membershipId,
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