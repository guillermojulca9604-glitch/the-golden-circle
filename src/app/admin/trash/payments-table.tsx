
"use client"

import {
  useEffect,
  useState,
  type FormEvent,
} from "react"

import { useFormStatus } from "react-dom"

import {
  permanentlyHidePayments,
  restorePayment,
} from "./actions"

export type PaymentInTrash = {
  id: string
  email: string
  plan: string
  amount: string
  paymentDate: string
  trashedDate: string
  remainingDays: number
}

type PaymentsTrashTableProps = {
  payments: PaymentInTrash[]
}

type GoldCheckboxProps = {
  checked: boolean
  onToggle: () => void
  label: string
  disabled?: boolean
  form?: string
  name?: string
  value?: string
}

const DELETE_FORM_ID = "trash-delete-payments"

function GoldCheckbox({
  checked,
  onToggle,
  label,
  disabled = false,
  form,
  name,
  value,
}: GoldCheckboxProps) {
  return (
    <label
      className={`relative inline-flex h-5 w-5 shrink-0 items-center justify-center ${
        disabled
          ? "cursor-default opacity-40"
          : "cursor-pointer"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        disabled={disabled}
        aria-label={label}
        form={form}
        name={name}
        value={value}
        className="peer absolute inset-0 m-0 h-5 w-5 cursor-pointer appearance-none rounded-[5px] border border-gold/45 bg-gold/[0.035] checked:border-gold checked:bg-gold/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-default"
      />

      <svg
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
        className={`pointer-events-none relative z-10 h-3.5 w-3.5 text-gold ${
          checked ? "opacity-100" : "opacity-0"
        }`}
      >
        <path
          d="m4.5 10 3.5 3.5 7.5-7.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </label>
  )
}

function DeleteSubmitButton({
  selectedCount,
}: {
  selectedCount: number
}) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={selectedCount === 0 || pending}
      className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-xl border border-red-500/35 bg-red-500/[0.07] px-4 text-xs font-medium text-red-300 disabled:cursor-default disabled:opacity-40"
    >
      {pending
        ? "Eliminando..."
        : "Eliminar permanentemente"}
    </button>
  )
}

export function PaymentsTrashTable({
  payments,
}: PaymentsTrashTableProps) {
  const [selectedIds, setSelectedIds] = useState<
    string[]
  >([])

  useEffect(() => {
    const availableIds = new Set(
      payments.map((payment) => payment.id)
    )

    setSelectedIds((current) => {
      const valid = current.filter((id) =>
        availableIds.has(id)
      )

      return valid.length === current.length
        ? current
        : valid
    })
  }, [payments])

  const selectedSet = new Set(selectedIds)

  const selectedCount = payments.filter((payment) =>
    selectedSet.has(payment.id)
  ).length

  const allSelected =
    payments.length > 0 &&
    selectedCount === payments.length

  function togglePayment(paymentId: string) {
    setSelectedIds((current) => {
      if (current.includes(paymentId)) {
        return current.filter(
          (id) => id !== paymentId
        )
      }

      return [...current, paymentId]
    })
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedIds([])
      return
    }

    setSelectedIds(
      payments.map((payment) => payment.id)
    )
  }

  function confirmPermanentRemoval(
    event: FormEvent<HTMLFormElement>
  ) {
    if (selectedCount === 0) {
      event.preventDefault()
      return
    }

    const message =
      selectedCount === 1
        ? "¿Eliminar permanentemente este pago de la Papelera?\n\nNo podrás restaurarlo desde el administrador. El registro financiero permanecerá en Supabase."
        : `¿Eliminar permanentemente los ${selectedCount} pagos seleccionados de la Papelera?\n\nNo podrás restaurarlos desde el administrador. Sus registros financieros permanecerán en Supabase.`

    if (!window.confirm(message)) {
      event.preventDefault()
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gold/20 bg-black">
      <div className="flex justify-end border-b border-gold/15 px-4 py-3 sm:px-5">
        <form
          id={DELETE_FORM_ID}
          action={permanentlyHidePayments}
          onSubmit={confirmPermanentRemoval}
        >
          <DeleteSubmitButton
            selectedCount={selectedCount}
          />
        </form>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-left">
          <thead>
            <tr className="border-b border-gold/10 text-[11px] uppercase tracking-widest text-gold/60">
              <th className="px-5 py-4 font-medium">
                <div className="flex items-center gap-3">
                  <GoldCheckbox
                    checked={allSelected}
                    onToggle={toggleAll}
                    disabled={payments.length === 0}
                    label={
                      allSelected
                        ? "Deseleccionar todos los pagos"
                        : "Seleccionar todos los pagos"
                    }
                  />

                  <span>Correo</span>
                </div>
              </th>

              <th className="px-4 py-4 font-medium">
                Plan
              </th>

              <th className="px-4 py-4 font-medium">
                Monto
              </th>

              <th className="px-4 py-4 font-medium">
                Fecha de pago
              </th>

              <th className="px-4 py-4 font-medium">
                Días restantes
              </th>

              <th className="px-5 py-4 text-right font-medium">
                Acción
              </th>
            </tr>
          </thead>

          <tbody>
            {payments.map((payment) => (
              <tr
                key={payment.id}
                className="border-b border-gold/10 last:border-b-0"
              >
                <td className="max-w-[300px] px-5 py-4">
                  <div className="flex items-center gap-3">
                    <GoldCheckbox
                      checked={selectedSet.has(
                        payment.id
                      )}
                      onToggle={() =>
                        togglePayment(payment.id)
                      }
                      label={`Seleccionar pago de ${payment.email}`}
                      name="paymentIds"
                      value={payment.id}
                      form={DELETE_FORM_ID}
                    />

                    <div className="min-w-0">
                      <p
                        title={payment.email}
                        className="truncate text-sm text-foreground"
                      >
                        {payment.email}
                      </p>

                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Enviado el{" "}
                        {payment.trashedDate}
                      </p>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-4 text-sm text-muted-foreground">
                  {payment.plan}
                </td>

                <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-gold">
                  {payment.amount}
                </td>

                <td className="px-4 py-4 text-sm text-muted-foreground">
                  {payment.paymentDate}
                </td>

                <td className="whitespace-nowrap px-4 py-4 text-sm text-muted-foreground">
                  {payment.remainingDays} días
                </td>

                <td className="px-5 py-4 text-right">
                  <form action={restorePayment}>
                    <input
                      type="hidden"
                      name="paymentId"
                      value={payment.id}
                    />

                    <button
                      type="submit"
                      className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-xl border border-gold/35 px-4 text-xs text-gold transition-colors hover:border-gold/55 hover:bg-gold/[0.07]"
                    >
                      Restaurar
                    </button>
                  </form>
                </td>
              </tr>
            ))}

            {payments.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-12 text-center text-sm text-muted-foreground"
                >
                  La Papelera está vacía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
