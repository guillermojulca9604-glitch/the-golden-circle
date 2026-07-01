import Link from "next/link"
import { redirect } from "next/navigation"
import { AuthTopbarSimple } from "@/components/auth-topbar-simple"
import { SessionGuard } from "@/components/session-guard"
import { createClient } from "@/lib/supabase/server"
import { PRICES } from "@/lib/pricing"

export default async function PricingPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login?next=/pricing")
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

  const monthly = PRICES.peru.monthly
  const quarterly = PRICES.peru.quarterly

  return (
    <main className="min-h-dvh bg-background px-6 py-24 text-foreground">
      <SessionGuard mode="pricing" />
      <AuthTopbarSimple />

      <section className="mx-auto max-w-6xl text-center">
        <span className="pricing-label mb-5 block">Membresía privada</span>

        <h1 className="checkout-premium-title text-5xl font-light md:text-7xl">
          Elige tu acceso
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-muted-foreground">
          Selecciona una membresía para continuar con el acceso privado.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <Link
            href="/checkout?plan=monthly&country=pe"
            className="checkout-premium-card rounded-[34px] bg-black p-8 text-left transition hover:-translate-y-1"
          >
            <p className="pricing-label mb-4 block">Mensual</p>
            <h2 className="text-4xl font-light">{monthly.label}</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Acceso privado durante un mes.
            </p>
            <p className="mt-8 text-5xl font-light text-gold">{monthly.price}</p>
          </Link>

          <Link
            href="/checkout?plan=quarterly&country=pe"
            className="checkout-premium-card rounded-[34px] bg-black p-8 text-left transition hover:-translate-y-1"
          >
            <p className="pricing-label mb-4 block">Trimestral</p>
            <h2 className="text-4xl font-light">{quarterly.label}</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Acceso privado durante tres meses.
            </p>
            <p className="mt-8 text-5xl font-light text-gold">
              {quarterly.price}
            </p>
          </Link>
        </div>
      </section>
    </main>
  )
}