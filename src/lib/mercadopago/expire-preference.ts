import { supabaseAdmin } from "@/lib/supabase/admin"

type MercadoPagoPayment = {
  status?: string

  external_reference?:
    | string
    | null
}

type ExternalReference = {
  attempt_id?: unknown
  user_id?: unknown
}

type PreferenceDetails = {
  preference_expired?: boolean

  date_of_expiration?:
    | string
    | null
}

export type ExpirePreferenceResult = {
  ok: boolean
  skipped?: boolean
  alreadyExpired?: boolean
  preferenceId?: string
  error?: string
}

function parseExternalReference(
  value: unknown
): ExternalReference | null {
  if (
    typeof value !== "string"
  ) {
    return null
  }

  try {
    const parsed =
      JSON.parse(value)

    if (
      typeof parsed !== "object" ||
      parsed === null
    ) {
      return null
    }

    return parsed as ExternalReference
  } catch {
    return null
  }
}

function dateIsExpired(
  value: unknown
) {
  if (
    typeof value !== "string"
  ) {
    return false
  }

  const timestamp =
    Date.parse(value)

  return (
    Number.isFinite(timestamp) &&
    timestamp <= Date.now()
  )
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

    return dateIsExpired(
      preference.date_of_expiration
    )
  } catch {
    return false
  }
}

export async function expirePreferenceForApprovedPayment(
  paymentId: string,
  expectedUserId?: string
): Promise<ExpirePreferenceResult> {
  const accessToken =
    process.env
      .MERCADO_PAGO_ACCESS_TOKEN

  if (!accessToken) {
    return {
      ok: false,

      error:
        "Mercado Pago no está configurado.",
    }
  }

  /*
   * Consultamos el pago directamente
   * en Mercado Pago.
   *
   * No confiamos en el estado enviado
   * por el navegador o el webhook.
   */
  let paymentResponse: Response

  try {
    paymentResponse =
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
  } catch {
    return {
      ok: false,

      error:
        "No se pudo consultar el pago para cerrar la preferencia.",
    }
  }

  const payment =
    (await paymentResponse
      .json()
      .catch(
        () => null
      )) as
      | MercadoPagoPayment
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
   * Nunca cerramos una preferencia
   * por un pago pendiente, rechazado
   * o inexistente.
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

  const reference =
    parseExternalReference(
      payment.external_reference
    )

  if (
    typeof reference?.attempt_id !==
      "string" ||
    reference.attempt_id.length ===
      0 ||
    typeof reference.user_id !==
      "string" ||
    reference.user_id.length ===
      0
  ) {
    return {
      ok: false,

      error:
        "El pago no contiene una referencia válida.",
    }
  }

  /*
   * Cuando la llamada viene desde
   * confirm-payment, comprobamos que
   * el pago pertenezca al usuario de
   * la sesión actual.
   */
  if (
    expectedUserId &&
    reference.user_id !==
      expectedUserId
  ) {
    return {
      ok: false,

      error:
        "El pago no pertenece a esta cuenta.",
    }
  }

  /*
   * Recuperamos la preferencia exacta
   * registrada cuando se inició este
   * intento de pago.
   */
  const {
    data: attempt,
    error: attemptError,
  } =
    await supabaseAdmin
      .from("payment_attempts")
      .select(
        "user_id, preference_id"
      )
      .eq(
        "id",
        reference.attempt_id
      )
      .limit(1)
      .maybeSingle()

  if (
    attemptError ||
    !attempt ||
    attempt.user_id !==
      reference.user_id ||
    typeof attempt.preference_id !==
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
   * Webhook y confirm-payment pueden
   * llamar esta función casi al mismo
   * tiempo.
   *
   * Si ya está vencida, consideramos
   * la operación completada.
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
      preferenceId,
    }
  }

  /*
   * Cambiamos el vencimiento de la
   * preferencia utilizada.
   *
   * Esta es la misma estrategia que
   * utilizaba la versión anterior que
   * cerraba la preferencia después de
   * un pago aprobado.
   */
  let expirationResponse: Response

  try {
    expirationResponse =
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
  } catch {
    return {
      ok: false,
      preferenceId,

      error:
        "No se pudo cerrar la preferencia de pago.",
    }
  }

  if (expirationResponse.ok) {
    return {
      ok: true,
      preferenceId,
    }
  }

  /*
   * Si webhook y confirm-payment
   * intentaron cerrarla simultáneamente,
   * Mercado Pago podría rechazar una de
   * las dos solicitudes aunque la otra
   * ya haya vencido la preferencia.
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
      preferenceId,
    }
  }

  return {
    ok: false,
    preferenceId,

    error:
      "Mercado Pago no permitió cerrar la preferencia.",
  }
}