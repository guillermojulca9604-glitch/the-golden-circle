import { NextResponse } from "next/server"

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
   * Esta es únicamente la sesión
   * de The Golden Circle.
   */
  if (!user) {
    return json(
      {
        active: false,
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
        error:
          "Identificador de pago inválido.",
      },
      400
    )
  }

  const result =
    await reconcilePaymentById(
      paymentId,
      user.id
    )

  return json(
    {
      active: result.active,
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