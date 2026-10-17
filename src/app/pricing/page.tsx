
import Link from "next/link"
import { Source_Serif_4 } from "next/font/google"
import { redirect } from "next/navigation"

import { AuthTopbarSimple } from "@/components/auth-topbar-simple"
import { SessionGuard } from "@/components/session-guard"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

const priceFont =
  Source_Serif_4({
    subsets: ["latin"],
    weight: "300",
    display: "swap",
  })

export const dynamic =
  "force-dynamic"

export default async function PricingPage() {
  const supabase =
    await createClient()

  const {
    data: { user },
  } =
    await supabase.auth.getUser()

  /*
   * Sin sesión, Pricing no se muestra.
   */
  if (!user) {
    redirect("/")
  }

  const {
    data: membership,
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

  /*
   * Un miembro activo no debe volver
   * a escoger un plan.
   */
  if (membership) {
    redirect("/vip")
  }

  return (
    <main className="min-h-dvh overflow-x-hidden bg-background px-4 pt-11 text-foreground sm:px-6">
      <SessionGuard mode="pricing" />
      <AuthTopbarSimple compactOnMobile />

      <div className="flex min-h-[calc(100dvh-2.75rem)] items-center py-[clamp(1.5rem,4vh,3rem)] max-sm:items-start max-sm:py-5">
        <section className="mx-auto w-full max-w-6xl text-center">
          <span className="pricing-label mb-[clamp(1rem,2.5vh,1.25rem)] block max-sm:mb-3">
            Membresía privada
          </span>

          <h1 className="checkout-premium-title text-[clamp(2.75rem,6vw,4.5rem)] font-light leading-[1.05] max-sm:text-[clamp(2rem,9vw,2.75rem)] max-sm:leading-tight">
            Elige tu acceso
          </h1>

          <p className="mx-auto mt-[clamp(1rem,3vh,1.5rem)] max-w-xl text-sm leading-7 text-muted-foreground max-sm:mt-3 max-sm:leading-6">
            Selecciona una membresía para
            continuar con el acceso privado.
          </p>

          <div className="mt-[clamp(2rem,5vh,3rem)] grid grid-cols-1 gap-6 lg:grid-cols-2 max-sm:mt-5 max-sm:gap-4">
            <article className="checkout-premium-card flex h-full rounded-[34px] bg-black p-[clamp(1.5rem,3vw,2rem)] text-left max-sm:p-4">
              <div className="flex w-full flex-col">
                <p className="pricing-label mb-4 block max-sm:mb-3">
                  Mensual
                </p>

                <h2 className="text-[clamp(2rem,4vw,2.25rem)] font-light leading-tight max-sm:text-[clamp(1.65rem,7.5vw,2rem)]">
                  Plan mensual
                </h2>

                <p className="mt-4 text-sm leading-7 text-foreground/60 max-sm:mt-2 max-sm:leading-6">
                  Acceso privado durante un mes.
                </p>

                <div
                  className={`${priceFont.className} mt-[clamp(1.5rem,4vh,2rem)] flex items-baseline gap-1.5 text-gold/90 max-sm:mt-4`}
                  style={{
                    fontVariantNumeric:
                      "lining-nums tabular-nums",
                  }}
                >
                  <span className="text-xl font-light leading-none">
                    S/
                  </span>

                  <span className="text-5xl font-light leading-none tracking-[-0.015em]">
                    30
                  </span>
                </div>

                <Link
                  href="/checkout?plan=monthly"
                  className="telegram-button subscription-premium-button mt-[clamp(1.5rem,4vh,2rem)] inline-flex w-full cursor-pointer items-center justify-center rounded-2xl px-6 py-4 text-xs uppercase tracking-[0.28em] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold max-sm:mt-4 max-sm:px-4 max-sm:tracking-[0.18em]"
                >
                  Seleccionar
                </Link>
              </div>
            </article>

            <article className="checkout-premium-card flex h-full rounded-[34px] bg-black p-[clamp(1.5rem,3vw,2rem)] text-left max-sm:p-4">
              <div className="flex w-full flex-col">
                <p className="pricing-label mb-4 block max-sm:mb-3">
                  Trimestral
                </p>

                <h2 className="text-[clamp(2rem,4vw,2.25rem)] font-light leading-tight max-sm:text-[clamp(1.65rem,7.5vw,2rem)]">
                  Plan trimestral
                </h2>

                <p className="mt-4 text-sm leading-7 text-foreground/60 max-sm:mt-2 max-sm:leading-6">
                  Acceso privado durante tres meses.
                </p>

                <div
                  className={`${priceFont.className} mt-[clamp(1.5rem,4vh,2rem)] flex items-baseline gap-1.5 text-gold/90 max-sm:mt-4`}
                  style={{
                    fontVariantNumeric:
                      "lining-nums tabular-nums",
                  }}
                >
                  <span className="text-xl font-light leading-none">
                    S/
                  </span>

                  <span className="text-5xl font-light leading-none tracking-[-0.015em]">
                    80
                  </span>
                </div>

                <Link
                  href="/checkout?plan=quarterly"
                  className="telegram-button subscription-premium-button mt-[clamp(1.5rem,4vh,2rem)] inline-flex w-full cursor-pointer items-center justify-center rounded-2xl px-6 py-4 text-xs uppercase tracking-[0.28em] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold max-sm:mt-4 max-sm:px-4 max-sm:tracking-[0.18em]"
                >
                  Seleccionar
                </Link>
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  )
}
