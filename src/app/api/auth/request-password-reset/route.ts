import {
  createHmac,
} from "node:crypto"

import {
  createClient,
} from "@supabase/supabase-js"

import {
  NextResponse,
} from "next/server"

import {
  supabaseAdmin,
} from "@/lib/supabase/admin"

export const runtime =
  "nodejs"

export const dynamic =
  "force-dynamic"

const PER_EMAIL_INTERVAL_SECONDS =
  60

const HOURLY_EMAIL_LIMIT =
  30

const DAILY_EMAIL_LIMIT =
  300

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type RequestPasswordResetBody = {
  email?: unknown
}

type ReservationResult = {
  allowed: boolean
  retry_at: string | null
  reservation_id:
    | number
    | string
    | null
}

function jsonResponse(
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

function normalizeEmail(
  value: unknown
) {
  if (
    typeof value !==
    "string"
  ) {
    return ""
  }

  return value
    .trim()
    .toLowerCase()
}

function createEmailHash(
  email: string
) {
  const secret =
    process.env
      .SUPABASE_SERVICE_ROLE_KEY

  if (!secret) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is missing."
    )
  }

  return createHmac(
    "sha256",
    secret
  )
    .update(email)
    .digest("hex")
}

function getRetryInformation(
  retryAtValue:
    string | null
) {
  const fallbackRetryAt =
    new Date(
      Date.now() +
        PER_EMAIL_INTERVAL_SECONDS *
          1000
    )

  const parsedRetryAt =
    retryAtValue
      ? new Date(
          retryAtValue
        )
      : fallbackRetryAt

  const retryAt =
    Number.isNaN(
      parsedRetryAt.getTime()
    )
      ? fallbackRetryAt
      : parsedRetryAt

  const retryAfterSeconds =
    Math.max(
      1,
      Math.ceil(
        (
          retryAt.getTime() -
          Date.now()
        ) / 1000
      )
    )

  return {
    retryAt:
      retryAt.toISOString(),

    retryAfterSeconds,
  }
}

async function deleteReservation(
  reservationId:
    | number
    | string
) {
  const {
    error,
  } =
    await supabaseAdmin
      .from(
        "password_reset_email_requests"
      )
      .delete()
      .eq(
        "id",
        reservationId
      )

  if (error) {
    console.error(
      "Could not delete password reset reservation:",
      error
    )
  }
}

export async function POST(
  request: Request
) {
  let body:
    RequestPasswordResetBody

  try {
    body =
      (await request.json()) as
        RequestPasswordResetBody
  } catch {
    return jsonResponse(
      {
        success: false,

        error:
          "La solicitud no es válida.",
      },
      400
    )
  }

  const email =
    normalizeEmail(
      body.email
    )

  if (
    !email ||
    !EMAIL_PATTERN.test(
      email
    )
  ) {
    return jsonResponse(
      {
        success: false,

        error:
          "Ingresa un correo válido.",
      },
      400
    )
  }

  let emailHash:
    string

  try {
    emailHash =
      createEmailHash(
        email
      )
  } catch (error) {
    console.error(
      "Could not create email hash:",
      error
    )

    return jsonResponse(
      {
        success: false,

        error:
          "No se pudo procesar la solicitud.",
      },
      500
    )
  }

  const {
    data:
      reservationData,

    error:
      reservationError,
  } =
    await supabaseAdmin
      .rpc(
        "reserve_password_reset_email_request",
        {
          p_email_hash:
            emailHash,

          p_per_email_interval_seconds:
            PER_EMAIL_INTERVAL_SECONDS,

          p_hourly_limit:
            HOURLY_EMAIL_LIMIT,

          p_daily_limit:
            DAILY_EMAIL_LIMIT,
        }
      )

  if (reservationError) {
    console.error(
      "Could not reserve password reset email:",
      reservationError
    )

    return jsonResponse(
      {
        success: false,

        error:
          "No se pudo procesar la solicitud.",
      },
      500
    )
  }

  const reservation =
    Array.isArray(
      reservationData
    )
      ? (
          reservationData[0] as
            | ReservationResult
            | undefined
        )
      : undefined

  if (!reservation) {
    return jsonResponse(
      {
        success: false,

        error:
          "No se pudo procesar la solicitud.",
      },
      500
    )
  }

  if (
    !reservation.allowed
  ) {
    const {
      retryAt,
      retryAfterSeconds,
    } =
      getRetryInformation(
        reservation.retry_at
      )

    return jsonResponse(
      {
        success: false,
        reason:
          "rate_limit",

        retryAt,
        retryAfterSeconds,
      },
      429
    )
  }

  const reservationId =
    reservation
      .reservation_id

  if (
    reservationId ===
      null ||
    reservationId ===
      undefined
  ) {
    return jsonResponse(
      {
        success: false,

        error:
          "No se pudo procesar la solicitud.",
      },
      500
    )
  }

  const supabaseUrl =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL

  const supabaseAnonKey =
    process.env
      .NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (
    !supabaseUrl ||
    !supabaseAnonKey
  ) {
    await deleteReservation(
      reservationId
    )

    console.error(
      "Supabase public environment variables are missing."
    )

    return jsonResponse(
      {
        success: false,

        error:
          "No se pudo enviar el correo.",
      },
      500
    )
  }

  const requestOrigin =
    new URL(
      request.url
    ).origin

  const configuredSiteUrl =
    process.env
      .NEXT_PUBLIC_SITE_URL
      ?.trim()
      .replace(
        /\/+$/,
        ""
      )

  const siteUrl =
    configuredSiteUrl ||
    requestOrigin

  const supabase =
    createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          autoRefreshToken:
            false,

          persistSession:
            false,

          detectSessionInUrl:
            false,
        },
      }
    )

  const {
    error:
      resetPasswordError,
  } =
    await supabase.auth
      .resetPasswordForEmail(
        email,
        {
          redirectTo:
            `${siteUrl}/auth/confirm?next=/reset-password`,
        }
      )

  if (
    resetPasswordError
  ) {
    await deleteReservation(
      reservationId
    )

    console.error(
      "Password reset email failed:",
      {
        code:
          resetPasswordError.code,

        status:
          resetPasswordError.status,

        message:
          resetPasswordError.message,
      }
    )

    if (
      resetPasswordError.status ===
        429 ||
      resetPasswordError.code ===
        "over_email_send_rate_limit" ||
      resetPasswordError.code ===
        "over_request_rate_limit"
    ) {
      const providerRetrySeconds =
        resetPasswordError.code ===
        "over_email_send_rate_limit"
          ? 60
          : 60 * 60

      const retryAt =
        new Date(
          Date.now() +
            providerRetrySeconds *
              1000
        )

      return jsonResponse(
        {
          success: false,
          reason:
            "rate_limit",

          retryAt:
            retryAt.toISOString(),

          retryAfterSeconds:
            providerRetrySeconds,
        },
        429
      )
    }

    return jsonResponse(
      {
        success: false,

        error:
          "No se pudo enviar el correo. Inténtalo nuevamente.",
      },
      502
    )
  }

  const sentAt =
    new Date().toISOString()

  const {
    error:
      sentStatusError,
  } =
    await supabaseAdmin
      .from(
        "password_reset_email_requests"
      )
      .update({
        status:
          "sent",

        sent_at:
          sentAt,
      })
      .eq(
        "id",
        reservationId
      )

  if (
    sentStatusError
  ) {
    console.error(
      "Email sent but reservation could not be marked as sent:",
      sentStatusError
    )
  }

  const retryAt =
    new Date(
      Date.now() +
        PER_EMAIL_INTERVAL_SECONDS *
          1000
    )

  return jsonResponse({
    success: true,

    message:
      "Confirma el enlace enviado a tu correo.",

    retryAt:
      retryAt.toISOString(),

    retryAfterSeconds:
      PER_EMAIL_INTERVAL_SECONDS,
  })
}