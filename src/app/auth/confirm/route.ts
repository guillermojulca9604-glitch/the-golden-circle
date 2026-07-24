import type {
  EmailOtpType,
} from "@supabase/supabase-js"

import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

const PASSWORD_RECOVERY_COOKIE =
  "golden_circle_password_recovery"

const PASSWORD_RECOVERY_DURATION_SECONDS =
  20 * 60

const EMAIL_OTP_TYPES:
  EmailOtpType[] = [
    "signup",
    "invite",
    "magiclink",
    "recovery",
    "email_change",
    "email",
  ]

function getSafeNextPath(
  value: string | null
) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "/entry"
  }

  return value
}

function isEmailOtpType(
  value: string | null
): value is EmailOtpType {
  if (!value) {
    return false
  }

  return EMAIL_OTP_TYPES.includes(
    value as EmailOtpType
  )
}

export async function GET(
  request: Request
) {
  const requestUrl =
    new URL(request.url)

  const tokenHash =
    requestUrl.searchParams.get(
      "token_hash"
    )

  const type =
    requestUrl.searchParams.get(
      "type"
    )

  const code =
    requestUrl.searchParams.get(
      "code"
    )

  const next =
    getSafeNextPath(
      requestUrl.searchParams.get(
        "next"
      )
    )

  const supabase =
    await createClient()

  let verified = false

  /*
   * Flujo mediante TokenHash:
   * confirmación de correo, recuperación,
   * invitaciones y enlaces mágicos.
   */
  if (
    tokenHash &&
    isEmailOtpType(type)
  ) {
    const {
      error,
    } =
      await supabase.auth.verifyOtp({
        token_hash:
          tokenHash,

        type,
      })

    verified = !error
  }

  /*
   * Compatibilidad con enlaces que
   * regresen mediante un código PKCE.
   */
  if (
    !verified &&
    code
  ) {
    const {
      error,
    } =
      await supabase.auth
        .exchangeCodeForSession(
          code
        )

    verified = !error
  }

  if (!verified) {
    return NextResponse.redirect(
      new URL(
        "/login?error=invalid-link",
        requestUrl.origin
      )
    )
  }

  const response =
    NextResponse.redirect(
      new URL(
        next,
        requestUrl.origin
      )
    )

  /*
   * La marca temporal permite distinguir
   * una recuperación real de una sesión
   * iniciada normalmente.
   */
  if (
    type === "recovery" ||
    next === "/reset-password"
  ) {
    response.cookies.set(
      PASSWORD_RECOVERY_COOKIE,
      "1",
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",

        sameSite: "lax",
        path: "/",

        maxAge:
          PASSWORD_RECOVERY_DURATION_SECONDS,
      }
    )
  }

  return response
}