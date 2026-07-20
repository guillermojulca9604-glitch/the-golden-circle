import { NextResponse } from "next/server"

import {
  buildExternalReference,
  findActiveMembership,
  isPlanId,
  PAYMENT_PLANS,
  reconcileRecentApprovedPaymentForUser,
} from "@/lib/mercadopago/reconcile-payment"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic =
  "force-dynamic"

function addMinutes(minutes: number) {
  const date = new Date()

  date.setMinutes(
    date.getMinutes() +
      minutes
  )

  return date.toISOString()
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

export async function POST(
  request: Request
) {
  const supabase =
    await createClient()

  const {
    data: { user },
  } =
    await supabase.auth.getUser()

  if (!user?.email) {
    return json(
      {
        error: "No autorizado",
      },
      401
    )
  }

  const body =
    await request
      .json()
      .catch(() => null)

  const requestedPlan =
    body?.plan

  if (!isPlanId(requestedPlan)) {
    return json(
      {
        error: "Plan inválido",
      },
      400
    )
  }

  const planId =
    requestedPlan

  const plan =
    PAYMENT_PLANS[planId]

  /*
   * Primera barrera:
   * una membresía activa nunca
   * puede generar otro pago.
   */
  const activeMembership =
    await findActiveMembership(
      user.id
    )

  if (activeMembership) {
    return json({
      url: "/vip",
    })
  }

  /*
   * Segunda barrera:
   * antes de crear o reutilizar una
   * preferencia, buscamos un pago
   * aprobado asociado a los intentos
   * recientes de este usuario.
   */
  const reconciliation =
    await reconcileRecentApprovedPaymentForUser(
      user.id
    )

  if (reconciliation.active) {
    return json({
      url: "/vip",
    })
  }

  /*
   * Si Mercado Pago no pudo ser
   * consultado, no arriesgamos un
   * segundo cobro.
   */
  if (!reconciliation.checked) {
    return json(
      {
        error:
          "No se pudo verificar el pago anterior. No se creó ningún cobro. Inténtalo nuevamente en unos momentos.",
      },
      503
    )
  }

  const accessToken =
    process.env
      .MERCADO_PAGO_ACCESS_TOKEN

  if (!accessToken) {
    return json(
      {
        error:
          "Falta configurar Mercado Pago.",
      },
      500
    )
  }

  const now =
    new Date().toISOString()

  /*
   * Si todavía no pagó, puede volver
   * a la misma pantalla de Mercado
   * Pago usando el intento vigente.
   */
  const {
    data: pendingAttempt,
  } =
    await supabaseAdmin
      .from("payment_attempts")
      .select(
        "id, payment_url"
      )
      .eq(
        "user_id",
        user.id
      )
      .eq(
        "plan",
        planId
      )
      .eq(
        "status",
        "pending"
      )
      .gt(
        "expires_at",
        now
      )
      .not(
        "payment_url",
        "is",
        null
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(1)
      .maybeSingle()

  if (
    pendingAttempt?.payment_url
  ) {
    return json({
      url:
        pendingAttempt.payment_url,
    })
  }

  const siteUrl = (
    process.env
      .NEXT_PUBLIC_SITE_URL ||
    "https://the-golden-circle-149p.vercel.app"
  ).replace(/\/$/, "")

  const expiresAt =
    addMinutes(20)

  const {
    data: attempt,
    error: attemptError,
  } =
    await supabaseAdmin
      .from("payment_attempts")
      .insert({
        user_id: user.id,
        email: user.email,
        plan: planId,
        status: "pending",
        expires_at:
          expiresAt,
      })
      .select("id")
      .single()

  if (
    attemptError ||
    !attempt
  ) {
    return json(
      {
        error:
          "No se pudo iniciar la operación de pago.",
      },
      500
    )
  }

  const externalReference =
    buildExternalReference(
      attempt.id,
      user.id,
      planId
    )

  const mercadoPagoResponse =
    await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        cache: "no-store",
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          items: [
            {
              title: plan.title,
              quantity: 1,
              unit_price:
                plan.price,
              currency_id:
                "PEN",
            },
          ],

          payer: {
            email: user.email,
          },

          external_reference:
            externalReference,

          back_urls: {
            success:
              `${siteUrl}` +
              "/payment-success",

            failure:
              `${siteUrl}` +
              `/checkout?plan=${planId}`,

            pending:
              `${siteUrl}` +
              "/payment-pending",
          },

          auto_return:
            "approved",

          notification_url:
            `${siteUrl}` +
            "/api/mercadopago/webhook",
        }),
      }
    )

  const mercadoPagoData =
    await mercadoPagoResponse
      .json()
      .catch(() => null)

  const paymentUrl =
    mercadoPagoData?.init_point

  const preferenceId =
    mercadoPagoData?.id

  if (
    !mercadoPagoResponse.ok ||
    typeof paymentUrl !==
      "string" ||
    paymentUrl.length === 0 ||
    typeof preferenceId !==
      "string" ||
    preferenceId.length === 0
  ) {
    await supabaseAdmin
      .from("payment_attempts")
      .update({
        status: "failed",
      })
      .eq(
        "id",
        attempt.id
      )

    return json(
      {
        error:
          "No se pudo preparar el pago. Inténtalo nuevamente.",
      },
      502
    )
  }

  const {
    error: updateError,
  } =
    await supabaseAdmin
      .from("payment_attempts")
      .update({
        payment_url:
          paymentUrl,
        preference_id:
          preferenceId,
      })
      .eq(
        "id",
        attempt.id
      )

  if (updateError) {
    await supabaseAdmin
      .from("payment_attempts")
      .update({
        status: "failed",
      })
      .eq(
        "id",
        attempt.id
      )

    return json(
      {
        error:
          "No se pudo guardar la operación de pago.",
      },
      500
    )
  }

  return json({
    url: paymentUrl,
  })
}