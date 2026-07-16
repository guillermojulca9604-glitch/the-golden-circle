import { redirect } from "next/navigation"
import { VipAccountMenu } from "@/components/vip-account-menu"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export default async function VipPage() {
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
      .select(
        "id, plan, expires_at"
      )
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

  if (!membership) {
    redirect(
      "/access?step=pricing"
    )
  }

  const expiresAt =
    new Date(
      membership.expires_at
    ).toLocaleDateString(
      "es-PE"
    )

  return (
    <main className="min-h-dvh bg-background px-6 py-24 text-foreground">
      <VipAccountMenu
        email={user.email}
      />

      <section className="mx-auto max-w-6xl text-center">
        <span className="pricing-label mb-5 block">
          The Golden Circle
        </span>

        <h1 className="checkout-premium-title text-5xl font-light md:text-7xl">
          Panel VIP
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-muted-foreground">
          Tu membresía está
          activa. Bienvenido al
          espacio privado.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <div className="checkout-premium-card rounded-[34px] bg-black p-7">
            <p className="text-xs uppercase tracking-[0.3em] text-gold/70">
              Estado
            </p>

            <h2 className="mt-4 text-3xl font-light text-gold">
              Activo
            </h2>
          </div>

          <div className="checkout-premium-card rounded-[34px] bg-black p-7">
            <p className="text-xs uppercase tracking-[0.3em] text-gold/70">
              Plan
            </p>

            <h2 className="mt-4 text-3xl font-light">
              {membership.plan ===
              "quarterly"
                ? "Trimestral"
                : "Mensual"}
            </h2>
          </div>

          <div className="checkout-premium-card rounded-[34px] bg-black p-7">
            <p className="text-xs uppercase tracking-[0.3em] text-gold/70">
              Vigencia
            </p>

            <h2 className="mt-4 text-3xl font-light">
              {expiresAt}
            </h2>
          </div>
        </div>

        <div className="checkout-premium-card mt-8 rounded-[34px] bg-black p-8 text-left">
          <h2 className="text-3xl font-light">
            Colección privada
          </h2>

          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            Aquí colocaremos el
            contenido exclusivo para
            miembros VIP.
          </p>
        </div>
      </section>
    </main>
  )
}