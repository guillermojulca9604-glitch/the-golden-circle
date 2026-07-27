import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

type GoogleTokenResponse = {
  id_token?: string
  error?: string
  error_description?: string
}

function getRequestOrigin(
  request: Request
) {
  const requestUrl =
    new URL(request.url)

  if (
    process.env.NODE_ENV !==
    "production"
  ) {
    return requestUrl.origin
  }

  const forwardedHost =
    request.headers
      .get("x-forwarded-host")
      ?.split(",")[0]
      ?.trim()

  if (!forwardedHost) {
    return requestUrl.origin
  }

  const forwardedProtocol =
    request.headers
      .get("x-forwarded-proto")
      ?.split(",")[0]
      ?.trim() || "https"

  return (
    `${forwardedProtocol}://` +
    forwardedHost
  )
}

export async function POST(
  request: Request
) {
  /*
   * Esta ruta solo acepta solicitudes
   * realizadas desde nuestro JavaScript.
   */
  const requestedWith =
    request.headers.get(
      "x-requested-with"
    )

  if (
    requestedWith !==
    "XMLHttpRequest"
  ) {
    return NextResponse.json(
      {
        error:
          "Solicitud no válida.",
      },
      {
        status: 400,
      }
    )
  }

  const requestOrigin =
    getRequestOrigin(request)

  const browserOrigin =
    request.headers.get("origin")

  /*
   * Rechaza solicitudes provenientes
   * de otra página.
   */
  if (
    browserOrigin &&
    browserOrigin !== requestOrigin
  ) {
    return NextResponse.json(
      {
        error:
          "Origen no autorizado.",
      },
      {
        status: 403,
      }
    )
  }

  let body: {
    code?: unknown
  }

  try {
    body =
      (await request.json()) as {
        code?: unknown
      }
  } catch {
    return NextResponse.json(
      {
        error:
          "Solicitud incompleta.",
      },
      {
        status: 400,
      }
    )
  }

  const code =
    typeof body.code === "string"
      ? body.code.trim()
      : ""

  if (!code) {
    return NextResponse.json(
      {
        error:
          "Google no entregó un código válido.",
      },
      {
        status: 400,
      }
    )
  }

  const clientId =
    process.env
      .NEXT_PUBLIC_GOOGLE_CLIENT_ID

  const clientSecret =
    process.env
      .GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.error(
      "Faltan NEXT_PUBLIC_GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET."
    )

    return NextResponse.json(
      {
        error:
          "Google todavía no está configurado completamente.",
      },
      {
        status: 500,
      }
    )
  }

  /*
   * Intercambia el código temporal
   * por los tokens de Google.
   */
  const tokenResponse =
    await fetch(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },

        body:
          new URLSearchParams({
            code,

            client_id:
              clientId,

            client_secret:
              clientSecret,

            /*
             * En popup Google utiliza
             * el origen actual.
             */
            redirect_uri:
              requestOrigin,

            grant_type:
              "authorization_code",
          }),

        cache: "no-store",
      }
    )

  const tokenData =
    (await tokenResponse.json()) as GoogleTokenResponse

  if (
    !tokenResponse.ok ||
    !tokenData.id_token
  ) {
    console.error(
      "Google rechazó el intercambio del código:",
      tokenData.error,
      tokenData.error_description
    )

    return NextResponse.json(
      {
        error:
          "Google no pudo validar el acceso. Inténtalo nuevamente.",
      },
      {
        status: 401,
      }
    )
  }

  /*
   * Supabase valida el token firmado
   * por Google y crea la sesión normal
   * que utiliza todo tu sistema VIP.
   */
  const supabase =
    await createClient()

  const {
    data,
    error,
  } =
    await supabase.auth
      .signInWithIdToken({
        provider: "google",
        token: tokenData.id_token,
      })

  if (
    error ||
    !data.user
  ) {
    console.error(
      "Supabase no pudo crear la sesión de Google:",
      error?.message
    )

    return NextResponse.json(
      {
        error:
          "No se pudo crear la sesión. Inténtalo nuevamente.",
      },
      {
        status: 401,
      }
    )
  }

  return NextResponse.json({
    success: true,
  })
}