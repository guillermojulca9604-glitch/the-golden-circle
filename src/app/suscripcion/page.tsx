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
    <main className="flex min-h-dvh items-center overflow-x-hidden bg-background px-4 py-[clamp(1.5rem,5vh,4rem)] text-foreground sm:px-6">
      <section className="mx-auto w-full max-w-6xl text-center">
        <span className="pricing-label mb-[clamp(1rem,2.5vh,1.25rem)] block">
          Membresía privada
        </span>

        <h1 className="checkout-premium-title text-[clamp(2.75rem,6vw,4.5rem)] font-light leading-[1.05]">
          Elige tu suscripción
        </h1>

        <p className="mx-auto mt-[clamp(1rem,3vh,1.5rem)] max-w-xl text-sm leading-7 text-muted-foreground">
          Selecciona el plan que prefieras.
          Después podrás crear una cuenta o
          iniciar sesión si ya tienes una.
        </p>

        <div className="mt-[clamp(2rem,5vh,3rem)] grid grid-cols-1 gap-6 lg:grid-cols-2">
          <article className="checkout-premium-card flex h-full rounded-[34px] bg-black p-[clamp(1.5rem,3vw,2rem)] text-left">
            <div className="flex w-full flex-col">
              <p className="pricing-label mb-4 block">
                Mensual
              </p>

              <h2 className="text-[clamp(2rem,4vw,2.25rem)] font-light leading-tight">
                Plan mensual
              </h2>

              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                Acceso privado durante un mes.
              </p>

              <p className="mt-[clamp(1.5rem,4vh,2rem)] text-5xl font-light text-gold">
                S/ 30
              </p>

              <Link
                href="/suscripcion/acceso?plan=monthly"
                className="telegram-button subscription-premium-button mt-[clamp(1.5rem,4vh,2rem)] inline-flex w-full cursor-pointer items-center justify-center rounded-2xl px-6 py-4 text-xs uppercase tracking-[0.28em] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
              >
                Seleccionar
              </Link>
            </div>
          </article>

          <article className="checkout-premium-card flex h-full rounded-[34px] bg-black p-[clamp(1.5rem,3vw,2rem)] text-left">
            <div className="flex w-full flex-col">
              <p className="pricing-label mb-4 block">
                Trimestral
              </p>

              <h2 className="text-[clamp(2rem,4vw,2.25rem)] font-light leading-tight">
                Plan trimestral
              </h2>

              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                Acceso privado durante tres meses.
              </p>

              <p className="mt-[clamp(1.5rem,4vh,2rem)] text-5xl font-light text-gold">
                S/ 90
              </p>

              <Link
                href="/suscripcion/acceso?plan=quarterly"
                className="telegram-button subscription-premium-button mt-[clamp(1.5rem,4vh,2rem)] inline-flex w-full cursor-pointer items-center justify-center rounded-2xl px-6 py-4 text-xs uppercase tracking-[0.28em] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
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