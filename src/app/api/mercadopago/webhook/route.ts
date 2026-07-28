import { NextResponse } from "next/server"

import {
  normalizePaymentId,
  reconcilePaymentById,
} from "@/lib/mercadopago/reconcile-payment"
import {
  expirePreferenceForApprovedPayment,
} from "@/lib/mercadopago/expire-preference"

export const dynamic =
  "force-dynamic"

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
      normalizePaymentId(
        value
      )

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
   * Algunas notificaciones enviadas
   * por Mercado Pago no corresponden
   * directamente a un pago.
   */
  if (!paymentId) {
    return json({
      received: true,
    })
  }

  /*
   * Consultamos el estado real del
   * pago y activamos la membresía
   * cuando está aprobado.
   */
  const result =
    await reconcilePaymentById(
      paymentId
    )

  /*
   * Un error temporal devuelve 5xx
   * para que Mercado Pago pueda
   * volver a enviar la notificación.
   */
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
   * Cuando el pago ya activó el VIP,
   * cerramos la preferencia exacta
   * que generó ese pago.
   *
   * Así, una pantalla anterior de
   * Mercado Pago no debe poder iniciar
   * otro cobro con la misma preferencia.
   */
  if (result.active) {
    const expiration =
      await expirePreferenceForApprovedPayment(
        paymentId
      )

    if (!expiration.ok) {
      /*
       * La membresía ya está activa,
       * pero devolvemos 500 para que
       * Mercado Pago vuelva a intentar
       * la notificación y el cierre.
       */
      return json(
        {
          received: false,
          active: true,
          status: result.status,
          payment_id:
            result.paymentId ||
            paymentId,
          error:
            expiration.error ||
            "No se pudo cerrar la preferencia de pago.",
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