
"use server"

import { revalidatePath } from "next/cache"

import { requireAdmin } from "@/lib/auth/require-admin"
import { supabaseAdmin } from "@/lib/supabase/admin"

export type VipPriceValues = {
  monthly_regular: number
  quarterly_regular: number
  monthly_promo: number
  quarterly_promo: number
}

function readPrice(
  formData: FormData,
  field: string
): number {
  const raw = formData.get(field)

  if (
    typeof raw !== "string" ||
    !/^[1-9]\d{0,3}(?:\.\d{1,2})?$/.test(raw)
  ) {
    throw new Error(
      "Introduce un precio válido entre S/ 1 y S/ 9999,99, con hasta dos decimales."
    )
  }

  return Number(raw)
}

function revalidateVipPrices() {
  for (const path of [
    "/admin",
    "/admin/prices",
    "/pricing",
    "/suscripcion",
    "/checkout",
  ]) {
    revalidatePath(path)
  }
}

/*
 * Guardar únicamente los precios.
 *
 * No modifica el estado de la promoción.
 */
export async function updateVipPrices(
  formData: FormData
): Promise<VipPriceValues> {
  await requireAdmin()

  const monthlyRegular = readPrice(
    formData,
    "monthly_regular"
  )

  const quarterlyRegular = readPrice(
    formData,
    "quarterly_regular"
  )

  const monthlyPromo = readPrice(
    formData,
    "monthly_promo"
  )

  const quarterlyPromo = readPrice(
    formData,
    "quarterly_promo"
  )

  if (
    monthlyPromo > monthlyRegular ||
    quarterlyPromo > quarterlyRegular
  ) {
    throw new Error(
      "El precio promocional no puede superar al precio normal."
    )
  }

  const newPrices: VipPriceValues = {
    monthly_regular: monthlyRegular,
    quarterly_regular: quarterlyRegular,
    monthly_promo: monthlyPromo,
    quarterly_promo: quarterlyPromo,
  }

  /*
   * Consultar los precios guardados.
   */
  const {
    data: current,
    error: currentError,
  } = await supabaseAdmin
    .from("vip_pricing_settings")
    .select(`
      monthly_regular,
      quarterly_regular,
      monthly_promo,
      quarterly_promo
    `)
    .eq("id", 1)
    .single()

  if (currentError || !current) {
    throw new Error(
      "No se pudieron consultar los precios actuales."
    )
  }

  /*
   * Si los valores son iguales,
   * no realizar ninguna actualización.
   */
  const noChanges =
    Number(current.monthly_regular) ===
      monthlyRegular &&
    Number(current.quarterly_regular) ===
      quarterlyRegular &&
    Number(current.monthly_promo) ===
      monthlyPromo &&
    Number(current.quarterly_promo) ===
      quarterlyPromo

  if (noChanges) {
    return newPrices
  }

  /*
   * Guardar los nuevos importes.
   *
   * promo_enabled permanece intacto.
   */
  const { data, error } = await supabaseAdmin
    .from("vip_pricing_settings")
    .update({
      ...newPrices,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1)
    .select(`
      monthly_regular,
      quarterly_regular,
      monthly_promo,
      quarterly_promo
    `)
    .single()

  if (error || !data) {
    console.error(
      "No se pudieron guardar los precios VIP:",
      error
    )

    throw new Error(
      "No se pudieron guardar los precios VIP."
    )
  }

  revalidateVipPrices()

  return {
    monthly_regular:
      Number(data.monthly_regular),
    quarterly_regular:
      Number(data.quarterly_regular),
    monthly_promo:
      Number(data.monthly_promo),
    quarterly_promo:
      Number(data.quarterly_promo),
  }
}

/*
 * Activar o desactivar la promoción.
 *
 * Esta acción es independiente
 * del guardado de precios.
 */
export async function setVipPromotionEnabled(
  enabled: boolean
): Promise<boolean> {
  await requireAdmin()

  if (typeof enabled !== "boolean") {
    throw new Error(
      "Estado de promoción inválido."
    )
  }

  /*
   * Consultar el estado actual.
   */
  const {
    data: current,
    error: currentError,
  } = await supabaseAdmin
    .from("vip_pricing_settings")
    .select("promo_enabled")
    .eq("id", 1)
    .single()

  if (currentError || !current) {
    throw new Error(
      "No se pudo consultar el estado de la promoción."
    )
  }

  /*
   * Si ya tiene el estado solicitado,
   * no realizar cambios.
   */
  if (current.promo_enabled === enabled) {
    return enabled
  }

  /*
   * Modificar exclusivamente
   * el estado de la promoción.
   */
  const { data, error } = await supabaseAdmin
    .from("vip_pricing_settings")
    .update({
      promo_enabled: enabled,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1)
    .select("promo_enabled")
    .single()

  if (error || !data) {
    console.error(
      "No se pudo actualizar la promoción VIP:",
      error
    )

    throw new Error(
      "No se pudo actualizar la promoción."
    )
  }

  revalidateVipPrices()

  return data.promo_enabled === true
}
