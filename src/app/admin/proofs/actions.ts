"use server"

import { revalidatePath } from "next/cache"
import { supabaseAdmin } from "@/lib/supabase/admin"

function addDays(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

export async function approveProof(formData: FormData) {
  const proofId = String(formData.get("proofId"))
  const userId = String(formData.get("userId"))
  const email = String(formData.get("email"))
  const plan = String(formData.get("plan"))

  const days = plan === "quarterly" ? 90 : 30
  const expiresAt = addDays(days)

  await supabaseAdmin
    .from("payment_proofs")
    .update({ status: "approved" })
    .eq("id", proofId)

  await supabaseAdmin.from("memberships").insert({
    user_id: userId,
    email,
    plan,
    status: "active",
    proof_id: proofId,
    expires_at: expiresAt,
  })

  await supabaseAdmin.from("admin_logs").insert({
    proof_id: proofId,
    user_id: userId,
    action: `approved_${plan}`,
  })

  revalidatePath("/admin/proofs")
  revalidatePath("/admin/approved")
  revalidatePath("/upload-proof")
}

export async function rejectProof(formData: FormData) {
  const proofId = String(formData.get("proofId"))
  const userId = String(formData.get("userId"))

  await supabaseAdmin
    .from("payment_proofs")
    .update({ status: "rejected" })
    .eq("id", proofId)

  await supabaseAdmin.from("admin_logs").insert({
    proof_id: proofId,
    user_id: userId,
    action: "rejected",
  })

  revalidatePath("/admin/proofs")
  revalidatePath("/upload-proof")
}

export async function deactivateMembership(formData: FormData) {
  const membershipId = String(formData.get("membershipId"))

  await supabaseAdmin
    .from("memberships")
    .update({
      status: "disabled",
      deactivated_reason: "Manual",
      deactivated_at: new Date().toISOString(),
    })
    .eq("id", membershipId)

  revalidatePath("/admin/approved")
  revalidatePath("/admin/disabled")
}

export async function activateMembership(formData: FormData) {
  const membershipId = String(formData.get("membershipId"))

  await supabaseAdmin
    .from("memberships")
    .update({
      status: "active",
      deactivated_reason: null,
      deactivated_at: null,
    })
    .eq("id", membershipId)

  revalidatePath("/admin/approved")
  revalidatePath("/admin/disabled")
}

export async function moveProofToTrash(formData: FormData) {
  const proofId = String(formData.get("proofId"))

  await supabaseAdmin
    .from("payment_proofs")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", proofId)

  revalidatePath("/admin/proofs")
  revalidatePath("/admin/approved")
  revalidatePath("/admin/trash")
}

export async function restoreProof(formData: FormData) {
  const proofId = String(formData.get("proofId"))

  await supabaseAdmin
    .from("payment_proofs")
    .update({ deleted_at: null })
    .eq("id", proofId)

  revalidatePath("/admin/trash")
  revalidatePath("/admin/proofs")
}

export async function deleteProofForever(formData: FormData) {
  const proofId = String(formData.get("proofId"))

  await supabaseAdmin
    .from("payment_proofs")
    .delete()
    .eq("id", proofId)

  revalidatePath("/admin/trash")
}