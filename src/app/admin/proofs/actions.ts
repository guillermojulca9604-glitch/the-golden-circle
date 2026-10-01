"use server"

import {
  revalidatePath,
} from "next/cache"

import {
  requireAdmin,
} from "@/lib/auth/require-admin"
import {
  supabaseAdmin,
} from "@/lib/supabase/admin"

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const MAXIMUM_BATCH_SIZE = 500

type PaymentProofRow = {
  id: string
  user_id: string
  email: string
  plan: string
  status: string
}

function addDays(
  days: number
) {
  const date =
    new Date()

  date.setDate(
    date.getDate() + days
  )

  return date.toISOString()
}

function getRequiredUuid(
  formData: FormData,
  fieldName: string
) {
  const value =
    formData.get(fieldName)

  if (
    typeof value !== "string" ||
    !UUID_PATTERN.test(
      value.trim()
    )
  ) {
    throw new Error(
      "El identificador recibido no es válido."
    )
  }

  return value.trim()
}

function getRequiredUuidList(
  formData: FormData,
  fieldName: string
) {
  const values =
    formData
      .getAll(fieldName)
      .filter(
        (
          value
        ): value is string =>
          typeof value ===
          "string"
      )
      .map(
        (value) =>
          value.trim()
      )
      .filter(Boolean)

  const uniqueValues =
    Array.from(
      new Set(values)
    )

  if (!uniqueValues.length) {
    throw new Error(
      "No se seleccionaron elementos."
    )
  }

  if (
    uniqueValues.length >
    MAXIMUM_BATCH_SIZE
  ) {
    throw new Error(
      "La selección es demasiado grande."
    )
  }

  const invalidValue =
    uniqueValues.find(
      (value) =>
        !UUID_PATTERN.test(
          value
        )
    )

  if (invalidValue) {
    throw new Error(
      "La selección contiene un identificador no válido."
    )
  }

  return uniqueValues
}

function revalidateAdminPages() {
  revalidatePath("/admin")
  revalidatePath("/admin/proofs")
  revalidatePath("/admin/approved")
  revalidatePath("/admin/activated")
  revalidatePath("/admin/disabled")
  revalidatePath("/admin/trash")
}

function revalidateMembershipPages() {
  revalidateAdminPages()
  revalidatePath("/vip")
  revalidatePath("/entry")
}

async function moveProofIdsToTrash(
  proofIds: string[],
  adminUserId: string
) {
  const {
    error,
  } =
    await supabaseAdmin
      .from("payment_proofs")
      .update({
        deleted_at:
          new Date().toISOString(),

        deleted_by:
          adminUserId,
      })
      .in(
        "id",
        proofIds
      )
      .is(
        "deleted_at",
        null
      )

  if (error) {
    console.error(
      "No se pudieron mover los pagos a la papelera:",
      error
    )

    throw new Error(
      "No se pudieron mover los pagos a la papelera."
    )
  }

  revalidateAdminPages()
}

export async function approveProof(
  formData: FormData
) {
  const admin =
    await requireAdmin()

  const proofId =
    getRequiredUuid(
      formData,
      "proofId"
    )

  const {
    data,
    error: proofError,
  } =
    await supabaseAdmin
      .from("payment_proofs")
      .select(
        `
          id,
          user_id,
          email,
          plan,
          status
        `
      )
      .eq(
        "id",
        proofId
      )
      .is(
        "deleted_at",
        null
      )
      .maybeSingle()

  if (proofError) {
    console.error(
      "No se pudo consultar el comprobante:",
      proofError
    )

    throw new Error(
      "No se pudo consultar el comprobante."
    )
  }

  if (!data) {
    throw new Error(
      "El comprobante ya no está disponible."
    )
  }

  const proof =
    data as PaymentProofRow

  if (
    proof.status !==
    "pending"
  ) {
    throw new Error(
      "El comprobante ya fue procesado."
    )
  }

  if (
    !UUID_PATTERN.test(
      proof.user_id
    )
  ) {
    throw new Error(
      "El comprobante no tiene un usuario válido."
    )
  }

  const email =
    proof.email
      .trim()
      .toLowerCase()

  if (!email) {
    throw new Error(
      "El comprobante no tiene un correo válido."
    )
  }

  if (
    proof.plan !== "monthly" &&
    proof.plan !== "quarterly"
  ) {
    throw new Error(
      "El comprobante no tiene un plan válido."
    )
  }

  const membershipDays =
    proof.plan ===
    "quarterly"
      ? 90
      : 30

  const expiresAt =
    addDays(
      membershipDays
    )

  const {
    data: updatedProof,
    error: updateError,
  } =
    await supabaseAdmin
      .from("payment_proofs")
      .update({
        status:
          "approved",
      })
      .eq(
        "id",
        proofId
      )
      .eq(
        "status",
        "pending"
      )
      .is(
        "deleted_at",
        null
      )
      .select("id")
      .maybeSingle()

  if (updateError) {
    console.error(
      "No se pudo aprobar el comprobante:",
      updateError
    )

    throw new Error(
      "No se pudo aprobar el comprobante."
    )
  }

  if (!updatedProof) {
    throw new Error(
      "El comprobante ya fue procesado."
    )
  }

  const {
    error:
      membershipError,
  } =
    await supabaseAdmin
      .from("memberships")
      .insert({
        user_id:
          proof.user_id,

        email,

        plan:
          proof.plan,

        status:
          "active",

        proof_id:
          proofId,

        expires_at:
          expiresAt,
      })

  if (membershipError) {
    console.error(
      "No se pudo crear la membresía:",
      membershipError
    )

    const {
      error:
        rollbackError,
    } =
      await supabaseAdmin
        .from(
          "payment_proofs"
        )
        .update({
          status:
            "pending",
        })
        .eq(
          "id",
          proofId
        )
        .eq(
          "status",
          "approved"
        )

    if (rollbackError) {
      console.error(
        "No se pudo revertir el comprobante después del error:",
        rollbackError
      )
    }

    throw new Error(
      "No se pudo crear la membresía."
    )
  }

  const {
    error: logError,
  } =
    await supabaseAdmin
      .from("admin_logs")
      .insert({
        proof_id:
          proofId,

        user_id:
          proof.user_id,

        action:
          `approved_${proof.plan}_by_${admin.userId}`,
      })

  if (logError) {
    console.error(
      "No se pudo registrar la aprobación:",
      logError
    )
  }

  revalidateMembershipPages()
  revalidatePath(
    "/upload-proof"
  )
}

export async function rejectProof(
  formData: FormData
) {
  const admin =
    await requireAdmin()

  const proofId =
    getRequiredUuid(
      formData,
      "proofId"
    )

  const {
    data: proof,
    error: proofError,
  } =
    await supabaseAdmin
      .from("payment_proofs")
      .select(
        `
          id,
          user_id,
          status
        `
      )
      .eq(
        "id",
        proofId
      )
      .is(
        "deleted_at",
        null
      )
      .maybeSingle()

  if (proofError) {
    console.error(
      "No se pudo consultar el comprobante:",
      proofError
    )

    throw new Error(
      "No se pudo consultar el comprobante."
    )
  }

  if (!proof) {
    throw new Error(
      "El comprobante ya no está disponible."
    )
  }

  if (
    proof.status !==
    "pending"
  ) {
    throw new Error(
      "El comprobante ya fue procesado."
    )
  }

  const {
    data: updatedProof,
    error: updateError,
  } =
    await supabaseAdmin
      .from("payment_proofs")
      .update({
        status:
          "rejected",
      })
      .eq(
        "id",
        proofId
      )
      .eq(
        "status",
        "pending"
      )
      .is(
        "deleted_at",
        null
      )
      .select("id")
      .maybeSingle()

  if (updateError) {
    console.error(
      "No se pudo rechazar el comprobante:",
      updateError
    )

    throw new Error(
      "No se pudo rechazar el comprobante."
    )
  }

  if (!updatedProof) {
    throw new Error(
      "El comprobante ya fue procesado."
    )
  }

  const {
    error: logError,
  } =
    await supabaseAdmin
      .from("admin_logs")
      .insert({
        proof_id:
          proofId,

        user_id:
          proof.user_id,

        action:
          `rejected_by_${admin.userId}`,
      })

  if (logError) {
    console.error(
      "No se pudo registrar el rechazo:",
      logError
    )
  }

  revalidateAdminPages()
  revalidatePath(
    "/upload-proof"
  )
}

export async function deactivateMembership(
  formData: FormData
) {
  await requireAdmin()

  const membershipId =
    getRequiredUuid(
      formData,
      "membershipId"
    )

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("memberships")
      .update({
        status:
          "disabled",

        deactivated_reason:
          "Manual",

        deactivated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        membershipId
      )
      .eq(
        "status",
        "active"
      )
      .is(
        "deleted_at",
        null
      )
      .select("id")
      .maybeSingle()

  if (error) {
    console.error(
      "No se pudo desactivar la membresía:",
      error
    )

    throw new Error(
      "No se pudo desactivar la membresía."
    )
  }

  if (!data) {
    throw new Error(
      "La membresía ya no está activa."
    )
  }

  revalidateMembershipPages()
}

export async function activateMembership(
  formData: FormData
) {
  await requireAdmin()

  const membershipId =
    getRequiredUuid(
      formData,
      "membershipId"
    )

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("memberships")
      .update({
        status:
          "active",

        deactivated_reason:
          null,

        deactivated_at:
          null,
      })
      .eq(
        "id",
        membershipId
      )
      .eq(
        "status",
        "disabled"
      )
      .is(
        "deleted_at",
        null
      )
      .select("id")
      .maybeSingle()

  if (error) {
    console.error(
      "No se pudo activar la membresía:",
      error
    )

    throw new Error(
      "No se pudo activar la membresía."
    )
  }

  if (!data) {
    throw new Error(
      "La membresía ya no está disponible para activarse."
    )
  }

  revalidateMembershipPages()
}

export async function moveProofToTrash(
  formData: FormData
) {
  const admin =
    await requireAdmin()

  const proofId =
    getRequiredUuid(
      formData,
      "proofId"
    )

  await moveProofIdsToTrash(
    [proofId],
    admin.userId
  )
}

export async function moveProofsToTrash(
  formData: FormData
) {
  const admin =
    await requireAdmin()

  const proofIds =
    getRequiredUuidList(
      formData,
      "proofId"
    )

  await moveProofIdsToTrash(
    proofIds,
    admin.userId
  )
}

export async function restoreProof(
  formData: FormData
) {
  await requireAdmin()

  const proofId =
    getRequiredUuid(
      formData,
      "proofId"
    )

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("payment_proofs")
      .update({
        deleted_at:
          null,

        deleted_by:
          null,
      })
      .eq(
        "id",
        proofId
      )
      .not(
        "deleted_at",
        "is",
        null
      )
      .select("id")
      .maybeSingle()

  if (error) {
    console.error(
      "No se pudo restaurar el pago:",
      error
    )

    throw new Error(
      "No se pudo restaurar el pago."
    )
  }

  if (!data) {
    throw new Error(
      "El pago ya no se encuentra en la papelera."
    )
  }

  revalidateAdminPages()
}

export async function deleteProofForever(
  formData: FormData
) {
  await requireAdmin()

  const proofId =
    getRequiredUuid(
      formData,
      "proofId"
    )

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("payment_proofs")
      .delete()
      .eq(
        "id",
        proofId
      )
      .not(
        "deleted_at",
        "is",
        null
      )
      .select("id")
      .maybeSingle()

  if (error) {
    console.error(
      "No se pudo eliminar permanentemente el pago:",
      error
    )

    throw new Error(
      "No se pudo eliminar permanentemente el pago."
    )
  }

  if (!data) {
    throw new Error(
      "El pago ya no se encuentra en la papelera."
    )
  }

  /*
   * Esta acción elimina el registro
   * de payment_proofs.
   *
   * No elimina cuentas de Supabase Auth
   * ni elimina membresías del cliente.
   */
  revalidateAdminPages()
}

export async function moveMembershipToTrash(
  formData: FormData
) {
  const admin =
    await requireAdmin()

  const membershipId =
    getRequiredUuid(
      formData,
      "membershipId"
    )

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("memberships")
      .update({
        deleted_at:
          new Date().toISOString(),

        deleted_by:
          admin.userId,
      })
      .eq(
        "id",
        membershipId
      )
      .eq(
        "status",
        "disabled"
      )
      .is(
        "deleted_at",
        null
      )
      .select("id")
      .maybeSingle()

  if (error) {
    console.error(
      "No se pudo mover el VIP vencido a la papelera:",
      error
    )

    throw new Error(
      "No se pudo mover el VIP vencido a la papelera."
    )
  }

  if (!data) {
    throw new Error(
      "Solo los VIP vencidos pueden enviarse a la papelera."
    )
  }

  revalidateMembershipPages()
}

export async function restoreMembership(
  formData: FormData
) {
  await requireAdmin()

  const membershipId =
    getRequiredUuid(
      formData,
      "membershipId"
    )

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("memberships")
      .update({
        deleted_at:
          null,

        deleted_by:
          null,
      })
      .eq(
        "id",
        membershipId
      )
      .not(
        "deleted_at",
        "is",
        null
      )
      .select("id")
      .maybeSingle()

  if (error) {
    console.error(
      "No se pudo restaurar el VIP vencido:",
      error
    )

    throw new Error(
      "No se pudo restaurar el VIP vencido."
    )
  }

  if (!data) {
    throw new Error(
      "El VIP vencido ya no se encuentra en la papelera."
    )
  }

  revalidateMembershipPages()
}

export async function deleteMembershipForever(
  formData: FormData
) {
  await requireAdmin()

  const membershipId =
    getRequiredUuid(
      formData,
      "membershipId"
    )

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("memberships")
      .delete()
      .eq(
        "id",
        membershipId
      )
      .not(
        "deleted_at",
        "is",
        null
      )
      .select("id")
      .maybeSingle()

  if (error) {
    console.error(
      "No se pudo eliminar permanentemente la membresía:",
      error
    )

    throw new Error(
      "No se pudo eliminar permanentemente la membresía."
    )
  }

  if (!data) {
    throw new Error(
      "La membresía ya no se encuentra en la papelera."
    )
  }

  /*
   * Elimina únicamente el registro
   * de memberships.
   *
   * No elimina la cuenta del usuario
   * en Supabase Auth ni sus pagos.
   */
  revalidateMembershipPages()
}