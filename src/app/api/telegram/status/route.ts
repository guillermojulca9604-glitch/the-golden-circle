import { NextResponse } from "next/server"

import { supabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const supabase =
      await createClient()

    const {
      data: { user },
    } =
      await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Debes iniciar sesión.",
        },
        {
          status: 401,
        }
      )
    }

    const now =
      new Date().toISOString()

    /*
     * ==================================
     * VIP ACTIVO ACTUAL
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
          "id"
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
          now
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

      return NextResponse.json(
        {
          ok: false,
          error:
            "No se pudo comprobar tu membresía.",
        },
        {
          status: 500,
        }
      )
    }

    /*
     * Si no existe un VIP activo,
     * para esta interfaz Telegram
     * no se considera vinculado.
     */
    if (!membership) {
      return NextResponse.json(
        {
          ok: true,
          linked: false,
          username: null,
        },
        {
          status: 200,
          headers: {
            "Cache-Control":
              "no-store, no-cache, must-revalidate",
          },
        }
      )
    }

    /*
     * ==================================
     * VINCULACIÓN TELEGRAM
     * ==================================
     */
    const {
      data: telegramLink,
      error: telegramError,
    } =
      await supabaseAdmin
        .from(
          "telegram_links"
        )
        .select(
          `
            telegram_user_id,
            telegram_username,
            membership_id,
            linked_at
          `
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle()

    if (telegramError) {
      console.error(
        "Error consultando Telegram:",
        telegramError
      )

      return NextResponse.json(
        {
          ok: false,
          error:
            "No se pudo consultar tu cuenta de Telegram.",
        },
        {
          status: 500,
        }
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
        String(
          membership.id
        )

    /*
     * START BOT = vinculación.
     *
     * No dependemos de:
     *
     * - active_invite_link
     * - si ya entró al canal
     * - si compartió el pase
     * - si salió voluntariamente
     */
    const linked =
      Boolean(
        sameVip &&
        telegramLink
          ?.telegram_user_id !=
          null &&
        telegramLink
          ?.linked_at !=
          null
      )

    return NextResponse.json(
      {
        ok: true,
        linked,
        username:
          linked
            ? (
                telegramLink
                  ?.telegram_username ??
                null
              )
            : null,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    )
  } catch (error) {
    console.error(
      "Error inesperado consultando Telegram:",
      error
    )

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se pudo consultar tu cuenta de Telegram.",
      },
      {
        status: 500,
      }
    )
  }
}