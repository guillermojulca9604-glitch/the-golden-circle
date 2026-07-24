import { redirect } from "next/navigation"

import { VipProfileSetup } from "./vip-profile-setup"

import { supabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

function readProfileName(
  metadata: Record<string, unknown>
) {
  const value = metadata.profile_name

  return typeof value === "string"
    ? value.trim()
    : ""
}

export default async function VipProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  const { data: membership } =
    await supabaseAdmin
      .from("memberships")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .gt(
        "expires_at",
        new Date().toISOString()
      )
      .order("expires_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle()

  if (!membership) {
    redirect("/access?step=pricing")
  }

  const metadata =
    user.user_metadata &&
    typeof user.user_metadata === "object"
      ? (
          user.user_metadata as Record<
            string,
            unknown
          >
        )
      : {}

  /*
   * Esta pantalla aparece solamente una vez.
   * Si el perfil ya existe, no puede volver
   * a mostrarse como paso inicial.
   */
  if (readProfileName(metadata)) {
    redirect("/vip")
  }

  return <VipProfileSetup />
}