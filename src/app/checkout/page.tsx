import Link from "next/link"
import { Source_Serif_4 } from "next/font/google"
import { redirect } from "next/navigation"

import { AuthTopbarSimple } from "@/components/auth-topbar-simple"
import { SessionGuard } from "@/components/session-guard"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { ActivateAccessButton } from "./activate-access-button"

const priceFont =
  Source_Serif_4({
    subsets: ["latin"],
    weight: "300",
    display: "swap",
  })

type Plan =
  | "monthly"
  | "quarterly"

type Props = {
  searchParams: Promise<{
    plan?: string
  }>
}

const plans: Record<
  Plan,
  {
    label: string
    price: string
    description: string
  }
> = {
  monthly: {
    label: "Mensual",
    price: "S/ 30",
    description:
      "Acceso privado durante 1 mes.",
  },

  quarterly: {
    label: "Trimestral",
    price: "S/ 80",
    description:
      "Acceso privado durante 3 meses.",
  },
}

export const dynamic =
  "force-dynamic"

export default async function CheckoutPage({
  searchParams,
}: Props) {
  const params =
    await searchParams

  const plan: Plan =
    params.plan === "quarterly"
      ? "quarterly"
      : "monthly"

  const supabase =
    await createClient()

  const {
    data: { user },
  } =
    await supabase.auth.getUser()

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

  if (membership) {
    redirect("/vip")
  }

  const selectedPlan =
    plans[plan]

  const [
    currency,
    amount,
  ] =
    selectedPlan.price.split(" ")

  return (
    <main className="min-h-dvh overflow-x-hidden bg-background px-4 pt-11 text-foreground sm:px-6">
      <SessionGuard mode="checkout" />
      <AuthTopbarSimple />

      <section className="mx-auto flex min-h-[calc(100dvh-2.75rem)] max-w-5xl items-center py-[clamp(1.5rem,4vh,3rem)]">
        <div className="w-full">
          <div className="mb-[clamp(1.5rem,4vh,2rem)] text-center">
            <span className="pricing-label mb-3 block">
              Checkout
            </span>

            <h1 className="checkout-premium-title text-[clamp(2.25rem,5vw,3.75rem)] font-light leading-none">
              CONFIRMAR COMPRA
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
              Revisa tu membresía antes de
              continuar.
            </p>
          </div>

          <div className="checkout-premium-card rounded-[34px] bg-black p-[clamp(1.5rem,3vw,2rem)]">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="space-y-5">
                <div>
                  <p className="checkout-premium-label text-xs uppercase tracking-widest">
                    Membresía
                  </p>

                  <h2 className="mt-3 text-3xl font-light">
                    {selectedPlan.label}
                  </h2>

                  <p className="mt-3 text-sm text-muted-foreground">
                    {selectedPlan.description}
                  </p>
                </div>

                <div className="rounded-2xl border border-gold/15 bg-black/40 p-[clamp(1.25rem,3vw,1.5rem)]">
                  <p className="checkout-premium-label text-xs uppercase tracking-widest">
                    Acceso
                  </p>

                  <p className="mt-3 text-2xl text-gold">
                    Miembros activos
                  </p>

                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    Acceso privado y futuras
                    actualizaciones exclusivas.
                  </p>
                </div>

                <Link
                  href="/pricing"
                  className="inline-block cursor-pointer text-sm text-gold/70 transition hover:text-gold"
                >
                  Cambiar membresía
                </Link>
              </div>

              <aside className="rounded-2xl border border-gold/15 bg-black/40 p-[clamp(1.25rem,3vw,1.5rem)]">
                <p className="mb-3 text-xs uppercase tracking-[0.3em] text-gold/70">
                  Total
                </p>

                <div
                  className={`${priceFont.className} mb-6 flex items-baseline gap-1.5 text-gold/90`}
                  style={{
                    fontVariantNumeric:
                      "lining-nums tabular-nums",
                  }}
                >
                  <span className="text-xl font-light leading-none">
                    {currency}
                  </span>

                  <span className="text-5xl font-light leading-none tracking-[-0.015em]">
                    {amount}
                  </span>
                </div>

                <ActivateAccessButton
                  plan={plan}
                />

                <p className="mt-5 text-xs leading-6 text-muted-foreground">
                  Serás redirigido a Mercado
                  Pago para completar la
                  operación.
                </p>
              </aside>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}