
import "server-only"

import { supabaseAdmin } from "@/lib/supabase/admin"

export type VipPlanId =
  | "monthly"
  | "quarterly"

export type VipPlanPrices =
  Record<VipPlanId, number>

export type VipPricingSettings = {
  regular: VipPlanPrices
  promotional: VipPlanPrices
  promoEnabled: boolean
  effective: VipPlanPrices
}

/*
 * Configuración central de precios VIP.
 *
 * Todos los importes se consultan desde Supabase.
 * Los precios normales y promocionales son editables
 * desde el administrador.
 */
export async function getVipPricingSettings():
  Promise<VipPricingSettings> {
  const { data, error } = await supabaseAdmin
    .from("vip_pricing_settings")
    .select(
      "monthly_regular, quarterly_regular, monthly_promo, quarterly_promo, promo_enabled"
    )
    .eq("id", 1)
    .single()

  if (error || !data) {
    throw new Error(
      "No se pudo consultar la configuración de precios VIP."
    )
  }

  const regular: VipPlanPrices = {
    monthly: Number(data.monthly_regular),
    quarterly: Number(data.quarterly_regular),
  }

  const promotional: VipPlanPrices = {
    monthly: Number(data.monthly_promo),
    quarterly: Number(data.quarterly_promo),
  }

  /*
   * Validar los importes almacenados.
   */
  if (
    [
      ...Object.values(regular),
      ...Object.values(promotional),
    ].some(
      (value) =>
        !Number.isFinite(value) ||
        value <= 0
    ) ||
    promotional.monthly > regular.monthly ||
    promotional.quarterly > regular.quarterly ||
    typeof data.promo_enabled !== "boolean"
  ) {
    throw new Error(
      "La configuración de precios VIP es inválida."
    )
  }

  const promoEnabled = data.promo_enabled

  /*
   * Si la promoción está activa:
   * cobrar precios promocionales.
   *
   * Si está pausada:
   * cobrar precios normales.
   */
  return {
    regular,
    promotional,
    promoEnabled,
    effective: promoEnabled
      ? promotional
      : regular,
  }
}

/*
 * Precios históricos utilizados antes
 * de implementar el sistema dinámico.
 *
 * Solo sirven como referencia para registros
 * antiguos que no tienen amount_pen.
 */
const LEGACY_PRICES: VipPlanPrices = {
  monthly: 30,
  quarterly: 80,
}

/*
 * Obtener el importe de un pago registrado.
 *
 * Para pagos nuevos se utiliza amount_pen.
 * Para registros antiguos sin importe se usa
 * la referencia histórica.
 */
export function getRecordedPaymentAmount(
  plan: string,
  amount: number | string | null | undefined
): number | null {
  if (
    plan !== "monthly" &&
    plan !== "quarterly"
  ) {
    return null
  }

  if (
    amount === null ||
    amount === undefined
  ) {
    return LEGACY_PRICES[plan]
  }

  const value = Number(amount)

  return Number.isFinite(value) &&
    value > 0
    ? value
    : null
}
