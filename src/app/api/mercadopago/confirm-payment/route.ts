import { NextResponse } from "next/server"

import {
  expirePreferenceForApprovedPayment,
} from "@/lib/mercadopago/expire-preference"
import {
  normalizePaymentId,
  reconcilePaymentById,
} from "@/lib/mercadopago/reconcile-payment"
import { createClient } from "@/lib/supabase/server"

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

export async function POST(
  request: Request
) {
  const supabase =
    await createClient()

  const {
    data: { user },
  } =
    await supabase.auth.getUser()

  /*
   * Esta ruta solo puede utilizarse
   * con una sesión válida de TGC.
   */
  if (!user) {
    return json(
      {
        active: false,
        preferenceClosed: false,
        error: "No autorizado",
      },
      401
    )
  }

  const body =
    await request
      .json()
      .catch(() => null)

  const paymentId =
    normalizePaymentId(
      body?.paymentId
    )

  if (!paymentId) {
    return json(
      {
        active: false,
        preferenceClosed: false,
        error:
          "Identificador de pago inválido.",
      },
      400
    )
  }

  /*
   * Consultamos el pago directamente
   * en Mercado Pago y comprobamos:
   *
   * - usuario;
   * - intento registrado;
   * - plan;
   * - precio;
   * - moneda;
   * - estado aprobado.
   */
  const result =
    await reconcilePaymentById(
      paymentId,
      user.id
    )

  if (!result.checked) {
    return json(
      {
        active: false,
        preferenceClosed: false,
        membership:
          result.membership,
        status: result.status,
        paymentId:
          result.paymentId ||
          paymentId,
        error:
          result.error ||
          "No se pudo verificar el pago.",
      },
      result.httpStatus
    )
  }

  /*
   * El pago todavía no está aprobado.
   * La pantalla de confirmación seguirá
   * comprobándolo nuevamente.
   */
  if (!result.active) {
    return json(
      {
        active: false,
        preferenceClosed: false,
        membership:
          result.membership,
        status: result.status,
        paymentId:
          result.paymentId ||
          paymentId,
        error: result.error,
      },
      result.httpStatus
    )
  }

  /*
   * La membresía ya está activa.
   * Antes de confirmar el final del flujo,
   * vencemos la preferencia exacta que
   * produjo este pago.
   */
  const expiration =
    await expirePreferenceForApprovedPayment(
      paymentId,
      user.id
    )

  if (
    !expiration.ok ||
    expiration.skipped
  ) {
    return json(
      {
        active: false,
        membership:
          result.membership,
        preferenceClosed: false,
        status:
          expiration.skipped
            ? "payment_not_approved"
            : result.status,
        paymentId:
          result.paymentId ||
          paymentId,
        error:
          expiration.error ||
          "El pago fue recibido, pero todavía no se pudo cerrar su operación. Se verificará nuevamente.",
      },
      expiration.skipped
        ? 202
        : 503
    )
  }

  /*
   * Solo respondemos active: true cuando:
   *
   * 1. el pago fue comprobado;
   * 2. la membresía está activa;
   * 3. la preferencia quedó vencida.
   */
  return json({
    active: true,
    membership:
      result.membership,
    preferenceClosed: true,
    status: result.status,
    paymentId:
      result.paymentId ||
      paymentId,
    preferenceId:
      expiration.preferenceId,
  })
}