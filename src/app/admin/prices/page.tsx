
import { getVipPricingSettings } from "@/lib/mercadopago/plan-prices"

import { VipPricesControls } from "./vip-prices-controls"

export const dynamic = "force-dynamic"

export default async function AdminPricesPage() {
  const vipPricing = await getVipPricingSettings()

  return (
    <div className="mx-auto w-full max-w-7xl">
      <h1 className="pr-14 text-3xl text-foreground sm:pr-16 sm:text-4xl">
        Precios VIP
      </h1>

      <VipPricesControls
        initialPrices={{
          monthly_regular: vipPricing.regular.monthly,
          quarterly_regular: vipPricing.regular.quarterly,
          monthly_promo: vipPricing.promotional.monthly,
          quarterly_promo: vipPricing.promotional.quarterly,
        }}
        initialPromotionEnabled={vipPricing.promoEnabled}
      />
    </div>
  )
}
