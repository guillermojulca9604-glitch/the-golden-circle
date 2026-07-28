import {
  after,
  NextResponse,
} from "next/server"

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
   * Solo una sesión válida de
   * The Golden Circle puede utilizar
   * esta ruta.
   */
  if (!user) {
    return json(
      {
        active: false,
        accessReady: false,
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
        accessReady: false,
        error:
          "Identificador de pago inválido.",
      },
      400
    )
  }

  /*
   * Esta función comprueba directamente:
   *
   * - el pago real en Mercado Pago;
   * - el usuario propietario;
   * - el intento registrado;
   * - el plan;
   * - el importe;
   * - la moneda;
   * - el estado aprobado.
   */
  const result =
    await reconcilePaymentById(
      paymentId,
      user.id
    )

  /*
   * Si la operación todavía no pudo
   * verificarse con seguridad, no
   * concedemos el acceso.
   */
  if (!result.checked) {
    return json(
      {
        active: false,
        accessReady: false,
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
   * Mercado Pago todavía no confirmó
   * un pago aprobado.
   */
  if (!result.active) {
    return json(
      {
        active: false,
        accessReady: false,
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
   * En este punto:
   *
   * - el pago ya fue comprobado;
   * - pertenece al usuario actual;
   * - la membresía VIP ya está activa.
   *
   * Respondemos inmediatamente para
   * no congelar la pantalla esperando
   * otra respuesta de Mercado Pago.
   */
  after(async () => {
    try {
      const expiration =
        await expirePreferenceForApprovedPayment(
          paymentId,
          user.id
        )

      if (
        !expiration.ok &&
        !expiration.skipped
      ) {
        console.error(
          "No se pudo cerrar la preferencia después de confirmar el acceso:",
          {
            paymentId,
            userId: user.id,
            error:
              expiration.error,
          }
        )
      }
    } catch (error) {
      console.error(
        "Error al cerrar la preferencia en segundo plano:",
        {
          paymentId,
          userId: user.id,
          error,
        }
      )
    }
  })

  /*
   * active: true solo aparece después
   * de validar el pago y activar la
   * membresía en el servidor.
   *
   * El cierre de la preferencia continúa
   * en segundo plano y también permanece
   * protegido por el webhook.
   */
  return json({
    active: true,
    accessReady: true,
    membership:
      result.membership,
    preferenceCloseScheduled:
      true,
    status: result.status,
    paymentId:
      result.paymentId ||
      paymentId,
  })
}