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
     *
     * Antes de hacer cualquier
     * operación de Telegram,
     * comprobamos si el servicio
     * está disponible.
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
       * el estado, cerramos el acceso
       * por seguridad.
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

    /*
     * ==================================
     * MEMBRESÍA VIP ACTIVA
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
     * ESTADO DEL PASE DE TELEGRAM
     * ==================================
     *
     * Hay dos situaciones:
     *
     * 1. active_invite_link EXISTE
     *
     *    El usuario ya habló con el bot,
     *    pero todavía tiene una
     *    invitación pendiente al canal.
     *
     *    Puede volver a generar acceso.
     *    El webhook reemplazará la
     *    invitación y mensaje anteriores.
     *
     * 2. active_invite_link ES NULL
     *    y Telegram sigue vinculado al
     *    mismo VIP.
     *
     *    Significa que el pase al canal
     *    ya fue utilizado/consumido.
     *
     *    No se genera otro.
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
          "telegram_user_id,membership_id,linked_at,active_invite_link"
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
        "Error comprobando el acceso de Telegram:",
        telegramLinkError
      )

      return json(
        {
          ok: false,
          error:
            "No se pudo comprobar tu acceso de Telegram.",
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

    const accessConsumed =
      sameVip &&
      telegramLink
        ?.telegram_user_id !=
        null &&
      telegramLink
        .linked_at !=
        null &&
      !telegramLink
        .active_invite_link

    /*
     * Este VIP ya utilizó su
     * único pase al canal.
     *
     * No importa si:
     *
     * - sigue dentro;
     * - salió voluntariamente;
     * - compartió su invitación;
     * - otra persona la utilizó.
     *
     * El pase no se devuelve.
     */
    if (accessConsumed) {
      return json(
        {
          ok: false,
          linked: true,
          consumed: true,
          error:
            "Este VIP ya utilizó su único acceso a Telegram.",
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
     * IMPORTANTE:
     *
     * Estos 10 minutos corresponden
     * únicamente al enlace:
     *
     * WEB → BOT
     *
     * No corresponden al pase que
     * entrega el bot para entrar
     * al canal.
     *
     * El pase BOT → CANAL será
     * controlado por el webhook y
     * durará hasta el vencimiento
     * real del VIP.
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
     * ==================================
     * REEMPLAZAR /START ANTERIOR
     * ==================================
     *
     * Mientras el pase al CANAL no
     * haya sido consumido, el usuario
     * puede volver a generar el acceso
     * al bot.
     *
     * Eliminamos cualquier token
     * WEB → BOT anterior sin utilizar.
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