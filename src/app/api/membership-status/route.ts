import { NextResponse } from "next/server"

import {
  reconcileRecentApprovedPaymentForUser,
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
        "no-store, no-cache, must-revalidate, max-age=0",
    },
  })
}

export async function GET() {
  const supabase =
    await createClient()

  const {
    data: { user },
  } =
    await supabase.auth.getUser()

  if (!user) {
    return json(
      {
        active: false,
        membership: null,
      },
      401
    )
  }

  /*
   * Esta comprobación no se limita
   * a mirar la tabla memberships.
   *
   * Si todavía no existe la membresía,
   * revisa los pagos recientes del
   * usuario directamente en Mercado
   * Pago y activa el acceso cuando
   * encuentre uno aprobado.
   */
  const result =
    await reconcileRecentApprovedPaymentForUser(
      user.id
    )

  if (!result.checked) {
    return json(
      {
        active: false,
        membership: null,
        verificationPending: true,
        error:
          result.error ||
          "No se pudo verificar el pago.",
      },
      result.httpStatus >= 500
        ? result.httpStatus
        : 503
    )
  }

  return json({
    active: result.active,
    membership:
      result.membership,
    status: result.status,
  })
}