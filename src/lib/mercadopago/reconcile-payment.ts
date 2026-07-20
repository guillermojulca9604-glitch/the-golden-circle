import { supabaseAdmin } from "@/lib/supabase/admin"

export const PAYMENT_PLANS = {
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

export type PlanId =
  keyof typeof PAYMENT_PLANS

type ActiveMembership = {
  id: string
  plan: string
  expires_at: string
}

type PaymentAttempt = {
  id: string
  user_id: string
  email: string
  plan: unknown
  status: string
}

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
    | string
    | number
  external_reference?:
    | string
    | null
}

type PaymentSearchResponse = {
  results?: unknown
}

export type ReconciliationResult = {
  active: boolean
  checked: boolean
  membership: ActiveMembership | null
  status: string
  paymentId?: string
  error?: string
  httpStatus: number
}

const RECENT_ATTEMPT_DAYS = 7

export function isPlanId(
  value: unknown
): value is PlanId {
  return (
    value === "monthly" ||
    value === "quarterly"
  )
}

export function normalizePaymentId(
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

  if (!/^\d+$/.test(cleanValue)) {
    return null
  }

  return cleanValue
}

export function buildExternalReference(
  attemptId: string,
  userId: string,
  plan: PlanId
) {
  return JSON.stringify({
    attempt_id: attemptId,
    user_id: userId,
    plan,
  })
}

function buildLegacyExternalReference(
  attempt: PaymentAttempt,
  plan: PlanId
) {
  return JSON.stringify({
    attempt_id: attempt.id,
    user_id: attempt.user_id,
    email: attempt.email,
    plan,
    days:
      PAYMENT_PLANS[plan].days,
  })
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

function addDays(days: number) {
  const date = new Date()

  date.setDate(
    date.getDate() + days
  )

  return date.toISOString()
}

function inactiveResult(
  status: string,
  httpStatus = 200
): ReconciliationResult {
  return {
    active: false,
    checked: true,
    membership: null,
    status,
    httpStatus,
  }
}

function unavailableResult(
  error: string,
  httpStatus = 503
): ReconciliationResult {
  return {
    active: false,
    checked: false,
    membership: null,
    status:
      "verification_unavailable",
    error,
    httpStatus,
  }
}

export async function findActiveMembership(
  userId: string
): Promise<ActiveMembership | null> {
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

async function getPaymentById(
  paymentId: string
) {
  const accessToken =
    process.env
      .MERCADO_PAGO_ACCESS_TOKEN

  if (!accessToken) {
    return {
      ok: false as const,
      status: 500,
      payment: null,
      error:
        "Mercado Pago no está configurado.",
    }
  }

  const response =
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

  if (response.status === 404) {
    return {
      ok: true as const,
      status: 404,
      payment: null,
      error: null,
    }
  }

  const payment =
    (await response
      .json()
      .catch(
        () => null
      )) as
      | MercadoPagoPayment
      | null

  if (
    !response.ok ||
    !payment
  ) {
    return {
      ok: false as const,
      status: response.status,
      payment: null,
      error:
        "No se pudo consultar el pago.",
    }
  }

  return {
    ok: true as const,
    status: response.status,
    payment,
    error: null,
  }
}

function extractSearchResults(
  value: unknown
): MercadoPagoPayment[] {
  const responseValue =
    Array.isArray(value)
      ? value[0]
      : value

  if (
    typeof responseValue !==
      "object" ||
    responseValue === null
  ) {
    return []
  }

  const results =
    (
      responseValue as
        PaymentSearchResponse
    ).results

  if (!Array.isArray(results)) {
    return []
  }

  return results.filter(
    (
      item
    ): item is MercadoPagoPayment =>
      typeof item === "object" &&
      item !== null
  )
}

async function searchPaymentsByReference(
  reference: string
) {
  const accessToken =
    process.env
      .MERCADO_PAGO_ACCESS_TOKEN

  if (!accessToken) {
    return {
      ok: false,
      payments:
        [] as MercadoPagoPayment[],
    }
  }

  const endDate =
    new Date()

  const beginDate =
    new Date(
      endDate.getTime() -
        RECENT_ATTEMPT_DAYS *
          24 *
          60 *
          60 *
          1000
    )

  const searchParams =
    new URLSearchParams({
      sort: "date_created",
      criteria: "desc",
      external_reference:
        reference,
      range: "date_created",
      begin_date:
        beginDate.toISOString(),
      end_date:
        endDate.toISOString(),
    })

  try {
    const response =
      await fetch(
        "https://api.mercadopago.com/v1/payments/search?" +
          searchParams.toString(),
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

    const body =
      await response
        .json()
        .catch(() => null)

    if (!response.ok) {
      return {
        ok: false,
        payments:
          [] as MercadoPagoPayment[],
      }
    }

    return {
      ok: true,
      payments:
        extractSearchResults(body),
    }
  } catch {
    return {
      ok: false,
      payments:
        [] as MercadoPagoPayment[],
    }
  }
}

async function searchPaymentsForAttempt(
  attempt: PaymentAttempt
) {
  if (!isPlanId(attempt.plan)) {
    return {
      ok: true,
      payments:
        [] as MercadoPagoPayment[],
    }
  }

  const canonicalReference =
    buildExternalReference(
      attempt.id,
      attempt.user_id,
      attempt.plan
    )

  const canonicalSearch =
    await searchPaymentsByReference(
      canonicalReference
    )

  if (
    canonicalSearch.ok &&
    canonicalSearch.payments.length >
      0
  ) {
    return canonicalSearch
  }

  /*
   * Compatibilidad con preferencias
   * creadas por versiones anteriores,
   * que guardaban email y days.
   */
  const legacyReference =
    buildLegacyExternalReference(
      attempt,
      attempt.plan
    )

  const legacySearch =
    await searchPaymentsByReference(
      legacyReference
    )

  if (
    !canonicalSearch.ok &&
    !legacySearch.ok
  ) {
    return {
      ok: false,
      payments:
        [] as MercadoPagoPayment[],
    }
  }

  const paymentMap =
    new Map<
      string,
      MercadoPagoPayment
    >()

  for (
    const payment of [
      ...canonicalSearch.payments,
      ...legacySearch.payments,
    ]
  ) {
    const paymentId =
      normalizePaymentId(
        payment.id
      )

    if (paymentId) {
      paymentMap.set(
        paymentId,
        payment
      )
    }
  }

  return {
    ok: true,
    payments: Array.from(
      paymentMap.values()
    ),
  }
}

async function activateApprovedPayment(
  payment: MercadoPagoPayment,
  expectedUserId?: string
): Promise<ReconciliationResult> {
  const paymentId =
    normalizePaymentId(
      payment.id
    )

  if (!paymentId) {
    return unavailableResult(
      "El pago no tiene un identificador válido.",
      400
    )
  }

  if (
    payment.status !==
      "approved"
  ) {
    return inactiveResult(
      payment.status ||
        "not_approved",
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
    return unavailableResult(
      "La referencia del pago es inválida.",
      400
    )
  }

  if (
    expectedUserId &&
    reference.user_id !==
      expectedUserId
  ) {
    return unavailableResult(
      "El pago no pertenece a esta cuenta.",
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
      .limit(1)
      .maybeSingle()

  if (
    attemptError ||
    !attempt
  ) {
    return unavailableResult(
      "No existe el intento asociado al pago.",
      400
    )
  }

  const attemptRow =
    attempt as PaymentAttempt

  if (
    attemptRow.user_id !==
      reference.user_id ||
    !isPlanId(
      attemptRow.plan
    ) ||
    attemptRow.plan !==
      reference.plan ||
    typeof attemptRow.email !==
      "string" ||
    attemptRow.email.length === 0
  ) {
    return unavailableResult(
      "El pago no coincide con la operación registrada.",
      400
    )
  }

  const plan =
    PAYMENT_PLANS[
      attemptRow.plan
    ]

  const paidAmount =
    Number(
      payment.transaction_amount
    )

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
    return unavailableResult(
      "El importe o la moneda del pago no coinciden.",
      400
    )
  }

  const {
    data:
      existingPaymentMembership,
    error:
      existingPaymentError,
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
      .limit(1)
      .maybeSingle()

  if (existingPaymentError) {
    return unavailableResult(
      "No se pudo comprobar si el pago ya fue procesado.",
      500
    )
  }

  if (
    existingPaymentMembership
  ) {
    if (
      existingPaymentMembership
        .user_id !==
      attemptRow.user_id
    ) {
      return unavailableResult(
        "El pago ya fue utilizado por otra cuenta.",
        409
      )
    }

    const activeMembership =
      await findActiveMembership(
        attemptRow.user_id
      )

    if (activeMembership) {
      return {
        active: true,
        checked: true,
        membership:
          activeMembership,
        status:
          "already_processed",
        paymentId,
        httpStatus: 200,
      }
    }

    /*
     * El pago ya fue consumido anteriormente.
     * No se reutiliza para reactivar una
     * membresía que ya terminó.
     */
    return inactiveResult(
      "already_used",
      409
    )
  }

  const {
    data: createdMembership,
    error: membershipError,
  } =
    await supabaseAdmin
      .from("memberships")
      .insert({
        user_id:
          attemptRow.user_id,
        email:
          attemptRow.email,
        plan:
          attemptRow.plan,
        status: "active",
        starts_at:
          new Date().toISOString(),
        expires_at:
          addDays(plan.days),
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
     * El webhook y una comprobación
     * del navegador pueden coincidir.
     * El índice único del payment_id
     * evita una membresía duplicada.
     */
    if (
      membershipError?.code ===
      "23505"
    ) {
      const concurrentMembership =
        await findActiveMembership(
          attemptRow.user_id
        )

      if (concurrentMembership) {
        return {
          active: true,
          checked: true,
          membership:
            concurrentMembership,
          status:
            "already_processed",
          paymentId,
          httpStatus: 200,
        }
      }
    }

    return unavailableResult(
      "No se pudo activar la membresía.",
      500
    )
  }

  const {
    error: disableOldError,
  } =
    await supabaseAdmin
      .from("memberships")
      .update({
        status: "disabled",
        deactivated_reason:
          "Replaced",
        deactivated_at:
          new Date().toISOString(),
      })
      .eq(
        "user_id",
        attemptRow.user_id
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
    await supabaseAdmin
      .from("memberships")
      .delete()
      .eq(
        "id",
        createdMembership.id
      )

    return unavailableResult(
      "No se pudieron actualizar las membresías anteriores.",
      500
    )
  }

  await supabaseAdmin
    .from("payment_attempts")
    .update({
      status: "approved",
    })
    .eq(
      "id",
      attemptRow.id
    )

  await supabaseAdmin
    .from("admin_logs")
    .insert({
      user_id:
        attemptRow.user_id,
      action:
        `mercadopago_approved_${attemptRow.plan}`,
      note:
        `payment_id:${paymentId}`,
    })

  return {
    active: true,
    checked: true,
    membership:
      createdMembership,
    status: "approved",
    paymentId,
    httpStatus: 200,
  }
}

export async function reconcilePaymentById(
  paymentId: string,
  expectedUserId?: string
): Promise<ReconciliationResult> {
  if (expectedUserId) {
    const activeMembership =
      await findActiveMembership(
        expectedUserId
      )

    if (activeMembership) {
      return {
        active: true,
        checked: true,
        membership:
          activeMembership,
        status:
          "already_active",
        paymentId,
        httpStatus: 200,
      }
    }
  }

  const paymentResult =
    await getPaymentById(
      paymentId
    )

  if (!paymentResult.ok) {
    return unavailableResult(
      paymentResult.error,
      paymentResult.status ||
        502
    )
  }

  if (!paymentResult.payment) {
    return inactiveResult(
      "not_available_yet",
      202
    )
  }

  return activateApprovedPayment(
    paymentResult.payment,
    expectedUserId
  )
}

export async function reconcileRecentApprovedPaymentForUser(
  userId: string
): Promise<ReconciliationResult> {
  const activeMembership =
    await findActiveMembership(
      userId
    )

  if (activeMembership) {
    return {
      active: true,
      checked: true,
      membership:
        activeMembership,
      status:
        "already_active",
      httpStatus: 200,
    }
  }

  if (
    !process.env
      .MERCADO_PAGO_ACCESS_TOKEN
  ) {
    return unavailableResult(
      "Mercado Pago no está configurado.",
      500
    )
  }

  const recentDate =
    new Date(
      Date.now() -
        RECENT_ATTEMPT_DAYS *
          24 *
          60 *
          60 *
          1000
    ).toISOString()

  const {
    data: attempts,
    error: attemptsError,
  } =
    await supabaseAdmin
      .from("payment_attempts")
      .select(
        "id, user_id, email, plan, status, created_at"
      )
      .eq(
        "user_id",
        userId
      )
      .in(
        "status",
        [
          "pending",
          "approved",
        ]
      )
      .gte(
        "created_at",
        recentDate
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(10)

  if (attemptsError) {
    return unavailableResult(
      "No se pudieron revisar las operaciones anteriores.",
      500
    )
  }

  if (
    !attempts ||
    attempts.length === 0
  ) {
    return inactiveResult(
      "no_recent_attempt"
    )
  }

  let verificationFailed =
    false

  for (const rawAttempt of attempts) {
    const attempt =
      rawAttempt as PaymentAttempt

    if (
      attempt.user_id !==
        userId ||
      !isPlanId(
        attempt.plan
      ) ||
      typeof attempt.email !==
        "string" ||
      attempt.email.length === 0
    ) {
      continue
    }

    const searchResult =
      await searchPaymentsForAttempt(
        attempt
      )

    if (!searchResult.ok) {
      verificationFailed = true
      continue
    }

    for (
      const payment of
        searchResult.payments
    ) {
      if (
        payment.status !==
          "approved"
      ) {
        continue
      }

      const activationResult =
        await activateApprovedPayment(
          payment,
          userId
        )

      if (
        activationResult.active
      ) {
        return activationResult
      }

      if (
        !activationResult.checked ||
        activationResult.httpStatus >=
          500
      ) {
        verificationFailed = true
      }
    }
  }

  if (verificationFailed) {
    return unavailableResult(
      "No se pudo confirmar con seguridad el estado del pago anterior.",
      503
    )
  }

  return inactiveResult(
    "no_approved_payment"
  )
}