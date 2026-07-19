import { NextResponse } from "next/server"

import { supabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

const PLANS = {
  monthly: {
    title: "TGC Access M",
    price: 30,
    days: 30,
  },
  quarterly: {
    title: "TGC Access T",
    price: 90,
    days: 90,
  },
} as const

type PlanId = keyof typeof PLANS

function isPlanId(
  value: unknown
): value is PlanId {
  return (
    value === "monthly" ||
    value === "quarterly"
  )
}

function addMinutes(minutes: number) {
  const date = new Date()

  date.setMinutes(
    date.getMinutes() + minutes
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

  const planId = requestedPlan
  const plan = PLANS[planId]
  const now = new Date().toISOString()

  /*
   * Un usuario que ya tiene
   * membresía no puede volver a pagar.
   */
  const {
    data: activeMembership,
  } =
    await supabaseAdmin
      .from("memberships")
      .select("id")
      .eq(
        "user_id",
        user.id
      )
      .eq(
        "status",
        "active"
      )
      .gt(
        "expires_at",
        now
      )
      .limit(1)
      .maybeSingle()

  if (activeMembership) {
    return json({
      url: "/vip",
    })
  }

  /*
   * Solo reutilizamos un intento
   * pendiente del mismo plan.
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

  const siteUrl = (
    process.env
      .NEXT_PUBLIC_SITE_URL ||
    "https://the-golden-circle-149p.vercel.app"
  ).replace(/\/$/, "")

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
          addMinutes(20),
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

  /*
   * Este identificador relaciona
   * el pago con la cuenta de TGC.
   *
   * No depende de la cuenta
   * utilizada dentro de Mercado Pago.
   */
  const externalReference =
    JSON.stringify({
      attempt_id: attempt.id,
      user_id: user.id,
      plan: planId,
    })

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
              currency_id: "PEN",
            },
          ],

          payer: {
            email: user.email,
          },

          external_reference:
            externalReference,

          back_urls: {
            /*
             * Pago aprobado.
             */
            success:
              `${siteUrl}` +
              "/payment-success",

            /*
             * Pago cancelado,
             * rechazado o regreso
             * sin completar.
             *
             * Con sesión:
             * vuelve a Checkout.
             *
             * Sin sesión:
             * Checkout lo devuelve
             * al Inicio.
             */
            failure:
              `${siteUrl}` +
              `/checkout?plan=${planId}`,

            /*
             * Pago todavía pendiente.
             */
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