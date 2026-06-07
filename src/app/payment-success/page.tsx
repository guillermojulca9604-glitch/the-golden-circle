import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { PaymentWaiter } from "./payment-waiter"

type Props = {
  searchParams: Promise<{
    payment_id?: string
  }>
}

export default async function PaymentSuccessPage({ searchParams }: Props) {
  const params = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login?next=/vip")
  }

  return (
    <main className="min-h-dvh bg-background px-6 py-24 text-foreground">
      <section className="mx-auto max-w-xl text-center">
        <div className="featured-card checkout-premium-card rounded-[34px] bg-black p-8">
          <span className="pricing-label mb-4 block">Verificación</span>

          <h1 className="checkout-premium-title mb-4 text-5xl font-light">
            Activando acceso
          </h1>

          <p className="text-sm leading-7 text-muted-foreground">
            Tu pago fue aprobado. Estamos habilitando tu acceso privado.
          </p>

          <PaymentWaiter paymentId={params.payment_id ?? ""} />
        </div>
      </section>
    </main>
  )
}