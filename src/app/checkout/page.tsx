import Link from "next/link"
import { redirect } from "next/navigation"

import { AuthTopbarSimple } from "@/components/auth-topbar-simple"
import { SessionGuard } from "@/components/session-guard"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { ActivateAccessButton } from "./activate-access-button"

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
    price: "S/ 90",
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

  return (
    <main className="min-h-dvh bg-background px-6 py-24 text-foreground">
      <SessionGuard mode="checkout" />
      <AuthTopbarSimple />

      <section className="mx-auto flex min-h-[calc(100dvh-96px)] max-w-5xl items-center">
        <div className="w-full">
          <div className="mb-8 text-center">
            <span className="pricing-label mb-3 block">
              Checkout
            </span>

            <h1 className="checkout-premium-title text-4xl font-light leading-none md:text-6xl">
              CONFIRMAR COMPRA
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
              Revisa tu membresía antes de
              continuar.
            </p>
          </div>

          <div className="checkout-premium-card rounded-[34px] bg-black p-6 md:p-8">
            <div className="grid gap-6 md:grid-cols-[1fr_300px]">
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

                <div className="rounded-2xl border border-gold/15 bg-black/40 p-5">
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
                  className="inline-block text-sm text-gold/70 transition hover:text-gold"
                >
                  Cambiar membresía
                </Link>
              </div>

              <aside className="rounded-2xl border border-gold/15 bg-black/40 p-6">
                <p className="mb-3 text-xs uppercase tracking-[0.3em] text-gold/70">
                  Total
                </p>

                <div className="checkout-premium-price mb-6 text-5xl font-light">
                  {selectedPlan.price}
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