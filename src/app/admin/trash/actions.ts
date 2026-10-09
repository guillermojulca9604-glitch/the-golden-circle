
"use server"

import { revalidatePath } from "next/cache"

import { requireAdmin } from "@/lib/auth/require-admin"
import { supabaseAdmin } from "@/lib/supabase/admin"

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const TRASH_DAYS = 30

const DAY_MS =
  24 * 60 * 60 * 1000

/*
 * Los pagos aprobados deben conservarse
 * en Supabase como registros financieros.
 *
 * Esta fecha especial indica que un pago
 * fue retirado definitivamente de la
 * Papelera administrativa.
 *
 * Queda fuera de la ventana de 30 días,
 * por lo que no volverá a mostrarse ni
 * podrá restaurarse desde el panel.
 */
const PERMANENTLY_HIDDEN_AT =
  "1970-01-01T00:00:00.000Z"

function getTrashCutoff() {
  return new Date(
    Date.now() - TRASH_DAYS * DAY_MS
  ).toISOString()
}

function revalidateAdminPages() {
  revalidatePath("/admin")
  revalidatePath("/admin/approved")
  revalidatePath("/admin/trash")
}

/*
 * Restaurar un pago aprobado desde
 * la Papelera al historial visible.
 */
export async function restorePayment(
  formData: FormData
) {
  await requireAdmin()

  const paymentId =
    formData.get("paymentId")

  if (
    typeof paymentId !== "string" ||
    !UUID_PATTERN.test(paymentId)
  ) {
    throw new Error(
      "Identificador de pago no válido."
    )
  }

  const { data, error } = await supabaseAdmin
    .from("payment_attempts")
    .update({
      admin_trashed_at: null,
    })
    .eq("id", paymentId)
    .eq("status", "approved")
    .gt(
      "admin_trashed_at",
      getTrashCutoff()
    )
    .select("id")
    .maybeSingle()

  if (error) {
    console.error(
      "Error al restaurar el pago:",
      error
    )

    throw new Error(
      "No se pudo restaurar el pago."
    )
  }

  if (!data) {
    throw new Error(
      "El pago no está disponible o superó los 30 días."
    )
  }

  revalidateAdminPages()
}

/*
 * Retirar definitivamente uno o varios
 * pagos de la Papelera administrativa.
 *
 * No se eliminan los registros de
 * payment_attempts, ni se modifican
 * los importes o el estado aprobado.
 */
export async function permanentlyHidePayments(
  formData: FormData
) {
  await requireAdmin()

  const receivedIds =
    formData.getAll("paymentIds")

  if (
    receivedIds.length === 0 ||
    receivedIds.length > 1000 ||
    !receivedIds.every(
      (value) =>
        typeof value === "string" &&
        UUID_PATTERN.test(value)
    )
  ) {
    throw new Error(
      "La selección de pagos no es válida."
    )
  }

  const paymentIds = receivedIds as string[]

  /*
   * No permitimos identificadores
   * duplicados en la solicitud.
   */
  const uniqueIds =
    Array.from(new Set(paymentIds))

  if (
    uniqueIds.length !== paymentIds.length
  ) {
    throw new Error(
      "La selección contiene pagos duplicados."
    )
  }

  const { data, error } = await supabaseAdmin
    .from("payment_attempts")
    .update({
      admin_trashed_at:
        PERMANENTLY_HIDDEN_AT,
    })
    .in("id", uniqueIds)
    .eq("status", "approved")
    .gt(
      "admin_trashed_at",
      getTrashCutoff()
    )
    .select("id")

  if (error) {
    console.error(
      "Error al retirar los pagos de la Papelera:",
      error
    )

    throw new Error(
      "No se pudieron eliminar los pagos de la Papelera."
    )
  }

  if (!data || data.length === 0) {
    throw new Error(
      "Los pagos seleccionados ya no están disponibles."
    )
  }

  revalidateAdminPages()
}
