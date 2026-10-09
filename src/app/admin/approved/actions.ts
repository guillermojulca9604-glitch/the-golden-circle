
"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/auth/require-admin"
import { supabaseAdmin } from "@/lib/supabase/admin"

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function movePaymentToTrash(
  formData: FormData
) {
  await requireAdmin()

  const paymentId = formData.get("paymentId")

  if (
    typeof paymentId !== "string" ||
    !UUID_PATTERN.test(paymentId)
  ) {
    throw new Error("El identificador del pago no es válido.")
  }

  const { data, error } = await supabaseAdmin
    .from("payment_attempts")
    .update({
      admin_trashed_at: new Date().toISOString(),
    })
    .eq("id", paymentId)
    .eq("status", "approved")
    .is("admin_trashed_at", null)
    .select("id")
    .maybeSingle()

  if (error) {
    console.error("Error al mover el pago a Papelera:", error)
    throw new Error("No se pudo mover el pago a Papelera.")
  }

  if (!data) {
    throw new Error(
      "El pago ya fue movido o no está disponible."
    )
  }

  revalidatePath("/admin")
  revalidatePath("/admin/approved")
  revalidatePath("/admin/trash")
}
