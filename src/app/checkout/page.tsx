import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { PRICES } from "@/lib/pricing"
import { createClient } from "@/lib/supabase/server"
import { ActivateAccessButton } from "./activate-access-button"

type Props = {
  searchParams: Promise<{
    plan?: string
    country?: string
  }>
}

export default async function CheckoutPage({ searchParams }: Props) {
  const params = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=/checkout?plan=${params.plan || "monthly"}&country=pe`)
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .maybeSingle()

  if (membership) {
    redirect("/vip")
  }

  const headerList = await headers()

  const countryFromIp =
    headerList.get("x-vercel-ip-country") ||
    headerList.get("cf-ipcountry") ||
    "PE"

  const isPeru = params.country === "pe" || countryFromIp === "PE"
  const planId = params.plan === "quarterly" ? "quarterly" : "monthly"

  const prices = isPeru ? PRICES.peru : PRICES.international
  const plan = prices[planId]

  return (
    <main className="min-h-dvh bg-background px-5 py-8 text-foreground md:px-6">
      <section className="mx-auto flex min-h-[calc(100dvh-64px)] max-w-5xl items-center">
        <div className="w-full">
          <div className="mb-8 text-center">
            <span className="pricing-label mb-3 block">
              Checkout
            </span>

            <h1 className="checkout-premium-title text-4xl font-light leading-none md:text-6xl">
              CONFIRMAR COMPRA
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
              Revisa tu membresía antes de continuar.
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
                    {plan.label}
                  </h2>

                  <p className="mt-3 text-sm text-muted-foreground">
                    {planId === "monthly"
                      ? "Acceso privado durante 1 mes."
                      : "Acceso privado durante 3 meses."}
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
                    Acceso privado y futuras actualizaciones exclusivas.
                  </p>
                </div>
              </div>

              <aside className="rounded-2xl border border-gold/15 bg-black/40 p-6">
                <p className="mb-3 text-xs uppercase tracking-[0.3em] text-gold/70">
                  Total
                </p>

                <div className="checkout-premium-price mb-6 text-5xl font-light">
                  {plan.price}
                </div>

                <ActivateAccessButton plan={planId} />

                <p className="mt-5 text-xs leading-6 text-muted-foreground">
                  Serás redirigido a Mercado Pago para completar la operación.
                </p>
              </aside>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}