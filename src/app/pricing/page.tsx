
import Link from "next/link"
import { Source_Serif_4 } from "next/font/google"
import { redirect } from "next/navigation"

import { AuthTopbarSimple } from "@/components/auth-topbar-simple"
import { SessionGuard } from "@/components/session-guard"
import { getVipPricingSettings } from "@/lib/mercadopago/plan-prices"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

const priceFont =
  Source_Serif_4({
    subsets: ["latin"],
    weight: "300",
    display: "swap",
  })

const priceFormatter =
  new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })

function formatPrice(price: number) {
  return priceFormatter.format(price)
}

type Plan = "monthly" | "quarterly"

type PricingPlanCardProps = {
  plan: Plan
  label: string
  description: string
  regularPrice: number
  currentPrice: number
  showPromo: boolean
}

/*
 * Etiqueta compartida para ambas tarjetas.
 */
function LimitedTimeBadge() {
  return (
    <span
      className="absolute right-5 top-5 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] max-sm:right-4 max-sm:top-4 max-sm:gap-1 max-sm:px-2 max-sm:text-[10px] max-sm:tracking-normal"
      style={{
        color: "#F3CC78",
        backgroundColor: "#000000",
        borderColor: "#947334",
        opacity: 1,
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="h-4 w-4 shrink-0 max-sm:h-3.5 max-sm:w-3.5"
      >
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth="1.8"
        />

        <path
          d="M12 7v5l3 2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      Por tiempo limitado
    </span>
  )
}

/*
 * Ambas tarjetas utilizan el mismo
 * componente y tratamiento gráfico.
 *
 * translateZ(0) no cambia la posición
 * ni las dimensiones de los elementos.
 */
function PricingPlanCard({
  plan,
  label,
  description,
  regularPrice,
  currentPrice,
  showPromo,
}: PricingPlanCardProps) {
  return (
    <article
      className="checkout-premium-card relative flex h-full rounded-[34px] bg-black p-[clamp(1.5rem,3vw,2rem)] text-left max-sm:p-4"
      style={{
        transform: "translateZ(0)",
        backfaceVisibility: "hidden",
      }}
    >
      <div className="flex w-full flex-col">
        <p className="pricing-label mb-4 block max-sm:mb-3">
          {label}
        </p>

        {showPromo && (
          <LimitedTimeBadge />
        )}

        <h2
          className="text-[clamp(2rem,4vw,2.25rem)] font-light leading-tight max-sm:text-[clamp(1.65rem,7.5vw,2rem)]"
          style={{
            color: "#F1EEE7",
            opacity: 1,
          }}
        >
          Plan {label.toLowerCase()}
        </h2>

        <p
          className="mt-4 text-sm leading-7 max-sm:mt-2 max-sm:leading-6"
          style={{
            color: "#918F8B",
            opacity: 1,
          }}
        >
          {description}
        </p>

        <div
          className={`${priceFont.className} mt-[clamp(1.5rem,4vh,2rem)] flex items-baseline gap-1.5 max-sm:mt-4`}
          style={{
            fontVariantNumeric:
              "lining-nums tabular-nums",
            color: "#C59F55",
            opacity: 1,
          }}
        >
          {showPromo && (
            <span
              className="mr-3 whitespace-nowrap text-[22px] font-light leading-none line-through max-sm:mr-2 max-sm:text-xl"
              style={{
                color: "#918F8B",
                textDecorationColor: "#947334",
                opacity: 1,
              }}
            >
              S/ {formatPrice(regularPrice)}
            </span>
          )}

          <span className="text-xl font-light leading-none">
            S/
          </span>

          <span className="text-5xl font-light leading-none tracking-[-0.015em]">
            {formatPrice(currentPrice)}
          </span>
        </div>

        <Link
          href={`/checkout?plan=${plan}`}
          className="telegram-button subscription-premium-button mt-[clamp(1.5rem,4vh,2rem)] inline-flex w-full cursor-pointer items-center justify-center rounded-2xl px-6 py-4 text-xs uppercase tracking-[0.28em] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold max-sm:mt-4 max-sm:px-4 max-sm:tracking-[0.18em]"
        >
          Seleccionar
        </Link>
      </div>
    </article>
  )
}

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

  /*
   * Precios dinámicos configurados
   * desde el administrador.
   */
  const vipPricing =
    await getVipPricingSettings()

  const monthlyPrice =
    vipPricing.effective.monthly

  const quarterlyPrice =
    vipPricing.effective.quarterly

  const showMonthlyPromo =
    vipPricing.promoEnabled &&
    vipPricing.promotional.monthly <
      vipPricing.regular.monthly

  const showQuarterlyPromo =
    vipPricing.promoEnabled &&
    vipPricing.promotional.quarterly <
      vipPricing.regular.quarterly

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
            <PricingPlanCard
              plan="monthly"
              label="Mensual"
              description="Acceso privado durante un mes."
              regularPrice={vipPricing.regular.monthly}
              currentPrice={monthlyPrice}
              showPromo={showMonthlyPromo}
            />

            <PricingPlanCard
              plan="quarterly"
              label="Trimestral"
              description="Acceso privado durante tres meses."
              regularPrice={vipPricing.regular.quarterly}
              currentPrice={quarterlyPrice}
              showPromo={showQuarterlyPromo}
            />
          </div>
        </section>
      </div>
    </main>
  )
}
