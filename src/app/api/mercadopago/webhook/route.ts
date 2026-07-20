import { NextResponse } from "next/server"

import {
  normalizePaymentId,
  reconcilePaymentById,
} from "@/lib/mercadopago/reconcile-payment"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const dynamic =
  "force-dynamic"

type PaymentForExpiration = {
  status?: string
  external_reference?:
    | string
    | null
}

type PreferenceDetails = {
  preference_expired?: boolean
  date_of_expiration?:
    | string
    | null
}

function json(
  body: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control":
        "no-store, max-age=0",
    },
  })
}

function readPaymentId(
  request: Request,
  body: unknown
) {
  const url =
    new URL(request.url)

  if (
    typeof body === "object" &&
    body !== null
  ) {
    const record =
      body as {
        data?: {
          id?:
            | string
            | number
        }

        id?:
          | string
          | number
      }

    const value =
      record.data?.id ??
      record.id

    const normalized =
      normalizePaymentId(value)

    if (normalized) {
      return normalized
    }
  }

  return (
    normalizePaymentId(
      url.searchParams.get(
        "data.id"
      )
    ) ||
    normalizePaymentId(
      url.searchParams.get(
        "id"
      )
    )
  )
}

function readAttemptId(
  externalReference: unknown
) {
  if (
    typeof externalReference !==
      "string"
  ) {
    return null
  }

  try {
    const parsed =
      JSON.parse(
        externalReference
      ) as {
        attempt_id?: unknown
      }

    if (
      typeof parsed.attempt_id !==
        "string" ||
      parsed.attempt_id.length === 0
    ) {
      return null
    }

    return parsed.attempt_id
  } catch {
    return null
  }
}

async function preferenceIsExpired(
  preferenceId: string,
  accessToken: string
) {
  try {
    const response =
      await fetch(
        `https://api.mercadopago.com/checkout/preferences/${encodeURIComponent(
          preferenceId
        )}`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Authorization:
              `Bearer ${accessToken}`,
            Accept:
              "application/json",
          },
        }
      )

    if (!response.ok) {
      return false
    }

    const preference =
      (await response
        .json()
        .catch(
          () => null
        )) as
        | PreferenceDetails
        | null

    if (!preference) {
      return false
    }

    if (
      preference.preference_expired ===
      true
    ) {
      return true
    }

    if (
      typeof preference
        .date_of_expiration ===
        "string"
    ) {
      const expirationTime =
        Date.parse(
          preference
            .date_of_expiration
        )

      return (
        Number.isFinite(
          expirationTime
        ) &&
        expirationTime <=
          Date.now()
      )
    }

    return false
  } catch {
    return false
  }
}

async function expirePreferenceAfterPayment(
  paymentId: string
) {
  const accessToken =
    process.env
      .MERCADO_PAGO_ACCESS_TOKEN

  if (!accessToken) {
    return {
      ok: false,
      error:
        "Falta configurar Mercado Pago.",
    }
  }

  /*
   * Consultamos el pago real para
   * obtener el intento asociado.
   */
  const paymentResponse =
    await fetch(
      `https://api.mercadopago.com/v1/payments/${encodeURIComponent(
        paymentId
      )}`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
          Accept:
            "application/json",
        },
      }
    )

  const payment =
    (await paymentResponse
      .json()
      .catch(
        () => null
      )) as
      | PaymentForExpiration
      | null

  if (
    !paymentResponse.ok ||
    !payment
  ) {
    return {
      ok: false,
      error:
        "No se pudo consultar el pago para cerrar la preferencia.",
    }
  }

  /*
   * Solamente cerramos la
   * preferencia cuando el pago
   * está realmente aprobado.
   */
  if (
    payment.status !==
      "approved"
  ) {
    return {
      ok: true,
      skipped: true,
    }
  }

  const attemptId =
    readAttemptId(
      payment.external_reference
    )

  if (!attemptId) {
    return {
      ok: false,
      error:
        "El pago no contiene un intento válido.",
    }
  }

  /*
   * Recuperamos la preferencia
   * exacta que generó el pago.
   */
  const {
    data: attempt,
    error: attemptError,
  } =
    await supabaseAdmin
      .from("payment_attempts")
      .select(
        "preference_id"
      )
      .eq(
        "id",
        attemptId
      )
      .limit(1)
      .maybeSingle()

  if (
    attemptError ||
    typeof attempt
      ?.preference_id !==
      "string" ||
    attempt.preference_id.length ===
      0
  ) {
    return {
      ok: false,
      error:
        "No se encontró la preferencia asociada al pago.",
    }
  }

  const preferenceId =
    attempt.preference_id

  /*
   * El webhook puede repetirse.
   * Si ya está vencida, no hacemos
   * ninguna modificación adicional.
   */
  const alreadyExpired =
    await preferenceIsExpired(
      preferenceId,
      accessToken
    )

  if (alreadyExpired) {
    return {
      ok: true,
      alreadyExpired: true,
    }
  }

  /*
   * Marcamos como vencida la
   * preferencia utilizada.
   *
   * Así la misma pantalla de
   * Mercado Pago no puede iniciar
   * un segundo cobro.
   */
  const expirationResponse =
    await fetch(
      `https://api.mercadopago.com/checkout/preferences/${encodeURIComponent(
        preferenceId
      )}`,
      {
        method: "PUT",
        cache: "no-store",
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
          "Content-Type":
            "application/json",
          Accept:
            "application/json",
        },
        body: JSON.stringify({
          date_of_expiration:
            new Date()
              .toISOString(),
        }),
      }
    )

  if (
    expirationResponse.ok
  ) {
    return {
      ok: true,
      preferenceId,
    }
  }

  /*
   * Si dos comprobaciones intentaron
   * vencerla al mismo tiempo, la API
   * puede responder con error aunque
   * ya haya quedado vencida.
   */
  const expiredAfterRequest =
    await preferenceIsExpired(
      preferenceId,
      accessToken
    )

  if (expiredAfterRequest) {
    return {
      ok: true,
      alreadyExpired: true,
    }
  }

  return {
    ok: false,
    error:
      "Mercado Pago no permitió cerrar la preferencia.",
  }
}

export async function POST(
  request: Request
) {
  const body =
    await request
      .json()
      .catch(() => null)

  const paymentId =
    readPaymentId(
      request,
      body
    )

  /*
   * Algunas notificaciones no
   * corresponden directamente
   * a un pago.
   */
  if (!paymentId) {
    return json({
      received: true,
    })
  }

  /*
   * Verificamos y procesamos el
   * pago usando la lógica que ya
   * está funcionando.
   */
  const result =
    await reconcilePaymentById(
      paymentId
    )

  if (!result.checked) {
    return json(
      {
        received: false,
        error:
          result.error ||
          "No se pudo verificar el pago.",
      },
      result.httpStatus >= 500
        ? result.httpStatus
        : 500
    )
  }

  /*
   * Una vez activada la membresía,
   * cerramos la preferencia exacta
   * para impedir otro cobro.
   */
  if (result.active) {
    const expiration =
      await expirePreferenceAfterPayment(
        paymentId
      )

    if (!expiration.ok) {
      /*
       * La membresía ya quedó activa,
       * pero devolvemos error para que
       * la notificación pueda volver
       * a intentarlo.
       */
      return json(
        {
          received: false,
          active: true,
          status:
            result.status,
          error:
            expiration.error ||
            "No se pudo cerrar la preferencia.",
        },
        500
      )
    }
  }

  return json({
    received: true,
    active: result.active,
    status: result.status,
    payment_id:
      result.paymentId ||
      paymentId,
  })
}

export async function GET() {
  return json({
    ok: true,
  })
}