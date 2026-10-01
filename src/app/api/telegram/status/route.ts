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

    const {
      data: telegramLink,
      error: telegramError,
    } =
      await supabaseAdmin
        .from("telegram_links")
        .select(
          `
            telegram_user_id,
            telegram_username,
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

    const linked =
      Boolean(
        telegramLink
          ?.telegram_user_id
      ) &&
      Boolean(
        telegramLink
          ?.linked_at
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