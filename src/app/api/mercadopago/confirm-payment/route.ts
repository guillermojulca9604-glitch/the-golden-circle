import { NextResponse } from "next/server"

import { supabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

const PLANS = {
  monthly: {
    price: 30,
    days: 30,
  },
  quarterly: {
    price: 90,
    days: 90,
  },
} as const

type PlanId =
  keyof typeof PLANS

type ExternalReference = {
  attempt_id?: unknown
  user_id?: unknown
  plan?: unknown
}

type MercadoPagoPayment = {
  id?: string | number
  status?: string
  currency_id?: string
  transaction_amount?:
    | number
    | string
  external_reference?:
    | string
    | null
}

function isPlanId(
  value: unknown
): value is PlanId {
  return (
    value === "monthly" ||
    value === "quarterly"
  )
}

function addDays(days: number) {
  const date = new Date()

  date.setDate(
    date.getDate() + days
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

function normalizePaymentId(
  value: unknown
) {
  if (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0
  ) {
    return String(value)
  }

  if (
    typeof value !== "string"
  ) {
    return null
  }

  const cleanValue =
    value.trim()

  if (
    !/^\d+$/.test(cleanValue)
  ) {
    return null
  }

  return cleanValue
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
      typeof parsed !==
        "object" ||
      parsed === null
    ) {
      return null
    }

    return parsed as ExternalReference
  } catch {
    return null
  }
}

async function findActiveMembership(
  userId: string
) {
  const {
    data: membership,
  } =
    await supabaseAdmin
      .from("memberships")
      .select(
        "id, plan, expires_at"
      )
      .eq(
        "user_id",
        userId
      )
      .eq(
        "status",
        "active"
      )
      .gt(
        "expires_at",
        new Date().toISOString()
      )
      .order(
        "expires_at",
        {
          ascending: false,
        }
      )
      .limit(1)
      .maybeSingle()

  return membership
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
   * Esta sesión es la de TGC.
   * No tiene relación con la
   * cuenta usada para pagar.
   */
  if (!user?.email) {
    return json(
      {
        active: false,
        error: "No autorizado",
      },
      401
    )
  }

  /*
   * Primero comprobamos si el
   * webhook ya hizo el trabajo.
   */
  const activeMembership =
    await findActiveMembership(
      user.id
    )

  if (activeMembership) {
    return json({
      active: true,
      membership:
        activeMembership,
    })
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

  const accessToken =
    process.env
      .MERCADO_PAGO_ACCESS_TOKEN

  if (!accessToken) {
    return json(
      {
        active: false,
        error:
          "Mercado Pago no está configurado.",
      },
      500
    )
  }

  /*
   * Consultamos el pago directamente
   * en Mercado Pago. No aceptamos el
   * estado enviado por el navegador
   * como prueba suficiente.
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

  if (
    paymentResponse.status === 404
  ) {
    return json(
      {
        active: false,
        status:
          "not_available_yet",
      },
      202
    )
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
    return json(
      {
        active: false,
        error:
          "No se pudo verificar el pago.",
      },
      502
    )
  }

  if (
    String(payment.id) !==
    paymentId
  ) {
    return json(
      {
        active: false,
        error:
          "El pago consultado no coincide.",
      },
      400
    )
  }

  /*
   * Un pago pendiente o rechazado
   * nunca activa la membresía.
   */
  if (
    payment.status !==
    "approved"
  ) {
    return json(
      {
        active: false,
        status:
          payment.status ||
          "unknown",
      },
      202
    )
  }

  const reference =
    parseExternalReference(
      payment.external_reference
    )

  if (
    typeof reference?.attempt_id !==
      "string" ||
    typeof reference.user_id !==
      "string" ||
    !isPlanId(reference.plan)
  ) {
    return json(
      {
        active: false,
        error:
          "Referencia de pago inválida.",
      },
      400
    )
  }

  /*
   * El pago solo puede activar
   * la cuenta TGC que lo inició.
   */
  if (
    reference.user_id !==
    user.id
  ) {
    return json(
      {
        active: false,
        error:
          "El pago no pertenece a esta cuenta.",
      },
      403
    )
  }

  const {
    data: attempt,
    error: attemptError,
  } =
    await supabaseAdmin
      .from("payment_attempts")
      .select(
        "id, user_id, email, plan, status"
      )
      .eq(
        "id",
        reference.attempt_id
      )
      .maybeSingle()

  if (
    attemptError ||
    !attempt
  ) {
    return json(
      {
        active: false,
        error:
          "No existe la operación asociada.",
      },
      400
    )
  }

  const attemptPlan:
    unknown =
      attempt.plan

  if (
    attempt.user_id !==
      user.id ||
    !isPlanId(attemptPlan) ||
    attemptPlan !==
      reference.plan ||
    typeof attempt.email !==
      "string" ||
    attempt.email.length === 0
  ) {
    return json(
      {
        active: false,
        error:
          "Los datos del pago no coinciden.",
      },
      400
    )
  }

  const plan =
    PLANS[attemptPlan]

  const paidAmount =
    Number(
      payment.transaction_amount
    )

  /*
   * Comprobamos moneda e importe.
   */
  if (
    payment.currency_id !==
      "PEN" ||
    !Number.isFinite(
      paidAmount
    ) ||
    Math.abs(
      paidAmount -
        plan.price
    ) > 0.001
  ) {
    return json(
      {
        active: false,
        error:
          "El importe o la moneda no coinciden.",
      },
      400
    )
  }

  /*
   * Impide utilizar dos veces
   * el mismo payment_id.
   */
  const {
    data:
      existingPaymentMembership,
  } =
    await supabaseAdmin
      .from("memberships")
      .select(
        "id, user_id"
      )
      .eq(
        "mercado_pago_payment_id",
        paymentId
      )
      .maybeSingle()

  if (
    existingPaymentMembership
  ) {
    if (
      existingPaymentMembership
        .user_id !== user.id
    ) {
      return json(
        {
          active: false,
          error:
            "El pago ya fue utilizado.",
        },
        409
      )
    }

    const existingActive =
      await findActiveMembership(
        user.id
      )

    return json(
      {
        active:
          Boolean(
            existingActive
          ),
        membership:
          existingActive,
        alreadyProcessed: true,
      },
      existingActive
        ? 200
        : 409
    )
  }

  /*
   * Creamos la membresía nueva.
   */
  const {
    data: createdMembership,
    error: membershipError,
  } =
    await supabaseAdmin
      .from("memberships")
      .insert({
        user_id:
          attempt.user_id,
        email:
          attempt.email,
        plan:
          attemptPlan,
        status:
          "active",
        starts_at:
          new Date()
            .toISOString(),
        expires_at:
          addDays(
            plan.days
          ),
        mercado_pago_payment_id:
          paymentId,
      })
      .select(
        "id, plan, expires_at"
      )
      .single()

  if (
    membershipError ||
    !createdMembership
  ) {
    /*
     * Puede ocurrir si el webhook
     * activó exactamente el mismo
     * pago al mismo tiempo.
     */
    if (
      membershipError?.code ===
      "23505"
    ) {
      const concurrentMembership =
        await findActiveMembership(
          user.id
        )

      return json({
        active:
          Boolean(
            concurrentMembership
          ),
        membership:
          concurrentMembership,
        alreadyProcessed: true,
      })
    }

    return json(
      {
        active: false,
        error:
          "No se pudo activar la membresía.",
      },
      500
    )
  }

  const now =
    new Date().toISOString()

  /*
   * Desactivamos membresías
   * anteriores, sin tocar
   * la nueva.
   */
  const {
    error:
      disableOldError,
  } =
    await supabaseAdmin
      .from("memberships")
      .update({
        status: "disabled",
        deactivated_reason:
          "Replaced",
        deactivated_at: now,
      })
      .eq(
        "user_id",
        user.id
      )
      .eq(
        "status",
        "active"
      )
      .neq(
        "id",
        createdMembership.id
      )

  if (disableOldError) {
    /*
     * Evitamos dejar un estado
     * parcialmente actualizado.
     */
    await supabaseAdmin
      .from("memberships")
      .delete()
      .eq(
        "id",
        createdMembership.id
      )

    return json(
      {
        active: false,
        error:
          "No se pudieron actualizar las membresías anteriores.",
      },
      500
    )
  }

  /*
   * La membresía ya está activa.
   * Estos dos registros son
   * administrativos.
   */
  await supabaseAdmin
    .from("payment_attempts")
    .update({
      status: "approved",
    })
    .eq(
      "id",
      attempt.id
    )

  await supabaseAdmin
    .from("admin_logs")
    .insert({
      user_id: user.id,
      action:
        `mercadopago_approved_${attemptPlan}`,
      note:
        `payment_id:${paymentId}`,
    })

  return json({
    active: true,
    membership:
      createdMembership,
  })
}