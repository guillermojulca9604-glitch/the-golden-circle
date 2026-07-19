import { redirect } from "next/navigation"

import { AuthTopbarSimple } from "@/components/auth-topbar-simple"
import { SessionGuard } from "@/components/session-guard"
import { createClient } from "@/lib/supabase/server"

import { PaymentSuccessWaiter } from "./payment-success-waiter"

type SearchValue =
  | string
  | string[]
  | undefined

type Props = {
  searchParams: Promise<{
    payment_id?: SearchValue
    collection_id?: SearchValue
  }>
}

function firstValue(
  value: SearchValue
) {
  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}

function normalizePaymentId(
  value: SearchValue
) {
  const selectedValue =
    firstValue(value)

  if (
    typeof selectedValue !==
    "string"
  ) {
    return null
  }

  const cleanValue =
    selectedValue.trim()

  return /^\d+$/.test(
    cleanValue
  )
    ? cleanValue
    : null
}

export default async function PaymentSuccessPage({
  searchParams,
}: Props) {
  const params =
    await searchParams

  const paymentId =
    normalizePaymentId(
      params.payment_id
    ) ||
    normalizePaymentId(
      params.collection_id
    )

  const supabase =
    await createClient()

  const {
    data: { user },
  } =
    await supabase.auth.getUser()

  /*
   * Esta comprobación utiliza
   * únicamente la sesión de TGC.
   *
   * La cuenta usada en Mercado Pago
   * no afecta esta sesión.
   */
  if (!user) {
    redirect("/")
  }

  return (
    <main className="min-h-dvh bg-background px-6 py-24 text-foreground">
      <SessionGuard mode="payment" />

      <AuthTopbarSimple />

      <section className="mx-auto max-w-xl text-center">
        <div className="checkout-premium-card rounded-[34px] bg-black p-8 md:p-10">
          <span className="pricing-label mb-4 block">
            Verificación
          </span>

          <h1 className="checkout-premium-title mb-4 text-5xl font-light">
            Activando acceso
          </h1>

          <p className="text-sm leading-7 text-muted-foreground">
            Estamos confirmando tu
            membresía. Cuando el pago
            sea validado, entrarás
            automáticamente al espacio
            VIP.
          </p>

          <PaymentSuccessWaiter
            paymentId={paymentId}
          />
        </div>
      </section>
    </main>
  )
}