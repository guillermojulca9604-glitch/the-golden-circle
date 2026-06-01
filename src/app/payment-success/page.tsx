import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function PaymentSuccessPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login?next=/vip")
  }

  const { data: activeMembership } = await supabase
    .from("memberships")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .maybeSingle()

  if (activeMembership) {
    redirect("/vip")
  }

  return (
    <main className="min-h-dvh bg-background px-6 py-24 text-foreground">
      <section className="mx-auto max-w-xl text-center">
        <div className="featured-card checkout-premium-card rounded-[34px] bg-black p-8">
          <span className="pricing-label mb-4 block">
            Verificación
          </span>

          <h1 className="checkout-premium-title mb-4 text-5xl font-light">
            Acceso en proceso
          </h1>

          <p className="text-sm leading-7 text-muted-foreground">
            Si el pago ya fue aprobado, tu acceso se activará automáticamente en unos instantes.
          </p>

          <Link
            href="/vip"
            className="telegram-button subscription-premium-button mt-8 inline-flex w-full items-center justify-center rounded-2xl px-6 py-4 text-xs uppercase tracking-[0.25em]"
          >
            Ir a VIP
          </Link>
        </div>
      </section>
    </main>
  )
}