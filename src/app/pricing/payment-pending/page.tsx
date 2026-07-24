import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { SessionGuard } from "@/components/session-guard"
import { AuthTopbarSimple } from "@/components/auth-topbar-simple"
import { PaymentPendingWaiter } from "./payment-pending-waiter"

export default async function PaymentPendingPage() {
  const supabase =
    await createClient()

  const {
    data: { user },
  } =
    await supabase.auth.getUser()

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
            Pago en proceso
          </h1>

          <p className="text-sm leading-7 text-muted-foreground">
            Estamos verificando tu
            operación. Si el pago fue
            aprobado, entrarás
            automáticamente al espacio
            VIP.
          </p>

          <PaymentPendingWaiter />
        </div>
      </section>
    </main>
  )
}