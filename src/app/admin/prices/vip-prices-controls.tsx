
"use client"

import { type FormEvent, useState } from "react"

import {
  setVipPromotionEnabled,
  updateVipPrices,
} from "../prices-actions"

type VipPriceValues = {
  monthly_regular: number
  quarterly_regular: number
  monthly_promo: number
  quarterly_promo: number
}

type PriceName = keyof VipPriceValues

type PriceInputs = Record<PriceName, string>

type Props = {
  initialPrices: VipPriceValues
  initialPromotionEnabled: boolean
}

type PlanName = "monthly" | "quarterly"

type PriceGroup = "regular" | "promo"

type EditedGroups = Record<
  PlanName,
  PriceGroup | null
>

const PRICE_NAMES: PriceName[] = [
  "monthly_regular",
  "quarterly_regular",
  "monthly_promo",
  "quarterly_promo",
]

const INPUT_PATTERN =
  /^\d{0,4}(?:\.\d{0,2})?$/

const VALID_PRICE_PATTERN =
  /^[1-9]\d{0,3}(?:\.\d{1,2})?$/

function toInputs(
  prices: VipPriceValues
): PriceInputs {
  return {
    monthly_regular: String(prices.monthly_regular),
    quarterly_regular: String(prices.quarterly_regular),
    monthly_promo: String(prices.monthly_promo),
    quarterly_promo: String(prices.quarterly_promo),
  }
}

type PriceInputProps = {
  name: PriceName
  label: string
  value: string
  disabled: boolean
  warning?: boolean
  onChange: (
    name: PriceName,
    value: string
  ) => void
}

function PriceInput({
  name,
  label,
  value,
  disabled,
  warning = false,
  onChange,
}: PriceInputProps) {
  return (
    <label className="flex min-w-0 flex-col gap-2">
      <span className="text-[13px] font-medium text-foreground/85">
        {label}
      </span>

      <input
        name={name}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        maxLength={7}
        disabled={disabled}
        value={value}
        aria-invalid={warning}
        onChange={(event) =>
          onChange(name, event.target.value)
        }
        className={`h-12 w-full min-w-0 rounded-xl border bg-black px-4 text-sm text-foreground outline-none transition-[border-color,box-shadow] duration-200 disabled:opacity-60 ${
          warning
            ? "border-red-500/50 focus:border-red-400"
            : "border-gold/25 focus:border-gold/65 focus:shadow-[0_0_0_2px_rgba(197,159,85,0.08)]"
        }`}
      />

      {warning && (
        <span
          role="alert"
          className="text-xs leading-5 text-red-400"
        >
          El precio promocional es mayor al normal.
        </span>
      )}
    </label>
  )
}

export function VipPricesControls({
  initialPrices,
  initialPromotionEnabled,
}: Props) {
  const [savedPrices, setSavedPrices] =
    useState<VipPriceValues>(initialPrices)

  const [values, setValues] =
    useState<PriceInputs>(() => toInputs(initialPrices))

  const [promoEnabled, setPromoEnabled] =
    useState(initialPromotionEnabled)

  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(false)

  const [message, setMessage] =
    useState<string | null>(null)

  const [error, setError] =
    useState<string | null>(null)

  const [editedGroups, setEditedGroups] =
    useState<EditedGroups>({
      monthly: null,
      quarterly: null,
    })

  const busy = saving || toggling

  /*
   * Detectar cambios reales.
   */
  const hasChanges = PRICE_NAMES.some(
    (name) =>
      Number(values[name]) !== savedPrices[name]
  )

  /*
   * Validar importes.
   */
  const allNumbersValid = PRICE_NAMES.every(
    (name) =>
      VALID_PRICE_PATTERN.test(values[name])
  )

  /*
   * Comparar precios por plan.
   */
  const monthlyMismatch =
    VALID_PRICE_PATTERN.test(
      values.monthly_regular
    ) &&
    VALID_PRICE_PATTERN.test(
      values.monthly_promo
    ) &&
    Number(values.monthly_promo) >
      Number(values.monthly_regular)

  const quarterlyMismatch =
    VALID_PRICE_PATTERN.test(
      values.quarterly_regular
    ) &&
    VALID_PRICE_PATTERN.test(
      values.quarterly_promo
    ) &&
    Number(values.quarterly_promo) >
      Number(values.quarterly_regular)

  const validPrices =
    allNumbersValid &&
    !monthlyMismatch &&
    !quarterlyMismatch

  const canSave =
    hasChanges &&
    validPrices &&
    !busy

  /*
   * Avisos dentro de la viñeta
   * donde se modifica el importe.
   */
  const monthlyWarningInRegular =
    monthlyMismatch &&
    editedGroups.monthly === "regular"

  const monthlyWarningInPromo =
    monthlyMismatch &&
    editedGroups.monthly !== "regular"

  const quarterlyWarningInRegular =
    quarterlyMismatch &&
    editedGroups.quarterly === "regular"

  const quarterlyWarningInPromo =
    quarterlyMismatch &&
    editedGroups.quarterly !== "regular"

  /*
   * Aceptar solo números y
   * hasta dos decimales.
   */
  function changePrice(
    name: PriceName,
    input: string
  ) {
    if (busy) return

    const normalized = input.replace(",", ".")

    if (!INPUT_PATTERN.test(normalized)) {
      return
    }

    setValues((previous) => ({
      ...previous,
      [name]: normalized,
    }))

    const plan: PlanName =
      name.startsWith("monthly")
        ? "monthly"
        : "quarterly"

    const group: PriceGroup =
      name.endsWith("_regular")
        ? "regular"
        : "promo"

    setEditedGroups((previous) => ({
      ...previous,
      [plan]: group,
    }))

    setMessage(null)
    setError(null)
  }

  /*
   * Guardar únicamente los precios.
   *
   * No modifica el estado
   * de la promoción.
   */
  async function handleSave(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (!canSave) return

    setSaving(true)
    setMessage(null)
    setError(null)

    try {
      const formData = new FormData()

      formData.set(
        "monthly_regular",
        values.monthly_regular
      )

      formData.set(
        "quarterly_regular",
        values.quarterly_regular
      )

      formData.set(
        "monthly_promo",
        values.monthly_promo
      )

      formData.set(
        "quarterly_promo",
        values.quarterly_promo
      )

      const saved = await updateVipPrices(formData)

      setSavedPrices(saved)
      setValues(toInputs(saved))

      setEditedGroups({
        monthly: null,
        quarterly: null,
      })

      setMessage("Cambios guardados correctamente.")
    } catch {
      setError("No se pudieron guardar los cambios.")
    } finally {
      setSaving(false)
    }
  }

  /*
   * Restaurar los últimos precios
   * guardados sin modificar Supabase.
   */
  function handleCancel() {
    if (busy || !hasChanges) return

    setValues(toInputs(savedPrices))

    setEditedGroups({
      monthly: null,
      quarterly: null,
    })

    setMessage(null)
    setError(null)
  }

  /*
   * Activar o desactivar la promoción.
   *
   * No muestra "Actualizando...".
   * No muestra mensajes de éxito.
   *
   * Solo cambia el botón y el indicador
   * cuando Supabase confirma la operación.
   */
  async function handleTogglePromotion() {
    if (busy) return

    setToggling(true)
    setMessage(null)
    setError(null)

    try {
      const updated =
        await setVipPromotionEnabled(!promoEnabled)

      setPromoEnabled(updated)
    } catch {
      setError(
        "No se pudo cambiar el estado de la promoción."
      )
    } finally {
      setToggling(false)
    }
  }

  return (
    <section className="mt-6 w-full">
      <form onSubmit={handleSave} noValidate>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* PRECIOS NORMALES */}
          <div className="min-w-0 rounded-[20px] border border-gold/20 bg-black px-5 pb-5 pt-6 sm:px-6">
            <h2 className="text-center text-[17px] font-medium tracking-[-0.01em] text-foreground">
              Precios normales
            </h2>

            <div className="mt-6 grid grid-cols-2 items-start gap-3 sm:gap-4">
              <PriceInput
                name="monthly_regular"
                label="Mensual (S/)"
                value={values.monthly_regular}
                disabled={busy}
                warning={monthlyWarningInRegular}
                onChange={changePrice}
              />

              <PriceInput
                name="quarterly_regular"
                label="Trimestral (S/)"
                value={values.quarterly_regular}
                disabled={busy}
                warning={quarterlyWarningInRegular}
                onChange={changePrice}
              />
            </div>
          </div>

          {/* PRECIOS PROMOCIONALES */}
          <div className="min-w-0 rounded-[20px] border border-gold/20 bg-black px-5 pb-5 pt-6 sm:px-6">
            <div className="relative flex min-h-6 items-center justify-center">
              {/* INDICADOR A LA IZQUIERDA */}
              <span
                className="absolute left-0 top-1/2 inline-flex -translate-y-1/2 items-center gap-2 whitespace-nowrap text-[13px] font-medium text-muted-foreground sm:text-sm"
                role="status"
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    promoEnabled
                      ? "bg-gold"
                      : "bg-foreground/30"
                  }`}
                  aria-hidden="true"
                />

                {promoEnabled
                  ? "Activado"
                  : "Desactivado"}
              </span>

              <h2 className="text-center text-[17px] font-medium tracking-[-0.01em] text-foreground">
                Precios promocionales
              </h2>
            </div>

            <div className="mt-6 grid grid-cols-2 items-start gap-3 sm:gap-4">
              <PriceInput
                name="monthly_promo"
                label="Mensual (S/)"
                value={values.monthly_promo}
                disabled={busy}
                warning={monthlyWarningInPromo}
                onChange={changePrice}
              />

              <PriceInput
                name="quarterly_promo"
                label="Trimestral (S/)"
                value={values.quarterly_promo}
                disabled={busy}
                warning={quarterlyWarningInPromo}
                onChange={changePrice}
              />
            </div>
          </div>
        </div>

        {/* BOTONES */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 px-1">
          {/* GUARDAR Y CANCELAR */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={!canSave}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gold/35 bg-gold/5 px-5 py-3 text-sm font-medium text-gold transition-[background-color,border-color,opacity] duration-200 hover:border-gold/60 hover:bg-gold/10 disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-gold/15 disabled:bg-transparent disabled:text-gold/35"
            >
              {saving
                ? "Guardando..."
                : "Guardar cambios"}
            </button>

            {hasChanges && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={busy}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-foreground/20 bg-black px-5 py-3 text-sm text-foreground/70 transition-[border-color,color] duration-200 hover:border-foreground/40 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              >
                Cancelar cambios
              </button>
            )}
          </div>

          {/* ACTIVAR / DESACTIVAR PROMOCIÓN */}
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={handleTogglePromotion}
              disabled={busy}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gold/40 bg-black px-5 py-3 text-sm font-medium text-gold transition-[background-color,border-color,opacity] duration-200 hover:border-gold/70 hover:bg-gold/5 disabled:pointer-events-none disabled:opacity-40"
            >
              {promoEnabled
                ? "Desactivar promoción"
                : "Activar promoción"}
            </button>
          </div>
        </div>

        {/* SOLO CONFIRMACIÓN DE PRECIOS Y ERRORES */}
        {(message || error) && (
          <div
            className="mt-4 px-1"
            aria-live="polite"
          >
            {message && (
              <p className="text-sm text-gold">
                {message}
              </p>
            )}

            {error && (
              <p
                role="alert"
                className="text-sm text-red-400"
              >
                {error}
              </p>
            )}
          </div>
        )}
      </form>
    </section>
  )
}
