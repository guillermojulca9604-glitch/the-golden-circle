import { NextResponse } from "next/server"

import { supabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

const CHANGE_COOLDOWN_DAYS = 7

const CHANGE_COOLDOWN_MS =
  CHANGE_COOLDOWN_DAYS *
  24 *
  60 *
  60 *
  1000

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

function canChange(
  nextChangeAt: Date | null
) {
  if (!nextChangeAt) {
    return true
  }

  return (
    nextChangeAt.getTime() <=
    Date.now()
  )
}

export async function GET() {
  const supabase =
    await createClient()

  const {
    data: { user },
  } =
    await supabase.auth.getUser()

  if (!user) {
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

  const {
    data: limits,
    error: limitsError,
  } =
    await supabaseAdmin
      .from(
        "user_account_change_limits"
      )
      .select(
        "username_changed_at, password_changed_at"
      )
      .eq("user_id", user.id)
      .maybeSingle()

  if (limitsError) {
    return NextResponse.json(
      {
        error:
          "No pudimos consultar los límites de tu cuenta.",
      },
      {
        status: 500,
      }
    )
  }

  const nextUsernameChange =
    getNextChangeAt(
      limits?.username_changed_at ??
        null
    )

  const nextPasswordChange =
    getNextChangeAt(
      limits?.password_changed_at ??
        null
    )

  return NextResponse.json(
    {
      username: {
        canChange: canChange(
          nextUsernameChange
        ),

        nextChangeAt:
          nextUsernameChange
            ?.toISOString() ??
          null,
      },

      password: {
        canChange: canChange(
          nextPasswordChange
        ),

        nextChangeAt:
          nextPasswordChange
            ?.toISOString() ??
          null,
      },
    },
    {
      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  )
}