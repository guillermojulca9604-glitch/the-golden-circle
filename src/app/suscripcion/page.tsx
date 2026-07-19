import Link from "next/link"
import { redirect } from "next/navigation"

import { supabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export default async function SubscriptionPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  /*
   * Si el usuario ya tiene una membresía activa,
   * no necesita escoger nuevamente un plan.
   */
  if (user) {
    const { data: membership } =
      await supabaseAdmin
        .from("memberships")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .gt(
          "expires_at",
          new Date().toISOString()
        )
        .order("expires_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle()

    if (membership) {
      redirect("/vip")
    }
  }

  return (
    <main className="min-h-dvh bg-background px-6 py-20 text-foreground">
      <section className="mx-auto max-w-6xl text-center">
        <span className="pricing-label mb-5 block">
          Membresía privada
        </span>

        <h1 className="checkout-premium-title text-5xl font-light md:text-7xl">
          Elige tu suscripción
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-muted-foreground">
          Selecciona el plan que prefieras.
          Después podrás crear una cuenta o
          iniciar sesión si ya tienes una.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <article className="checkout-premium-card flex rounded-[34px] bg-black p-8 text-left">
            <div className="flex w-full flex-col">
              <p className="pricing-label mb-4 block">
                Mensual
              </p>

              <h2 className="text-4xl font-light">
                Plan mensual
              </h2>

              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                Acceso privado durante un mes.
              </p>

              <p className="mt-8 text-5xl font-light text-gold">
                S/ 30
              </p>

              <Link
                href="/suscripcion/acceso?plan=monthly"
                className="telegram-button subscription-premium-button mt-8 inline-flex w-full items-center justify-center rounded-2xl px-6 py-4 text-xs uppercase tracking-[0.28em] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
              >
                Seleccionar
              </Link>
            </div>
          </article>

          <article className="checkout-premium-card flex rounded-[34px] bg-black p-8 text-left">
            <div className="flex w-full flex-col">
              <p className="pricing-label mb-4 block">
                Trimestral
              </p>

              <h2 className="text-4xl font-light">
                Plan trimestral
              </h2>

              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                Acceso privado durante tres meses.
              </p>

              <p className="mt-8 text-5xl font-light text-gold">
                S/ 90
              </p>

              <Link
                href="/suscripcion/acceso?plan=quarterly"
                className="telegram-button subscription-premium-button mt-8 inline-flex w-full items-center justify-center rounded-2xl px-6 py-4 text-xs uppercase tracking-[0.28em] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
              >
                Seleccionar
              </Link>
            </div>
          </article>
        </div>
      </section>
    </main>
  )
}