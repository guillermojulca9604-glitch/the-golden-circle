import { redirect } from "next/navigation"

import { supabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic =
  "force-dynamic"

export default async function EntryPage() {
  const supabase =
    await createClient()

  const {
    data: { user },
  } =
    await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const {
    data: adminUser,
    error: adminError,
  } =
    await supabaseAdmin
      .from("admin_users")
      .select("user_id")
      .eq(
        "user_id",
        user.id
      )
      .eq(
        "is_active",
        true
      )
      .maybeSingle()

  if (adminError) {
    console.error(
      "No se pudo comprobar el acceso administrativo:",
      adminError
    )

    throw new Error(
      "No se pudo comprobar el acceso administrativo."
    )
  }

  if (adminUser) {
    redirect("/admin")
  }

  const {
    data: membership,
  } =
    await supabaseAdmin
      .from("memberships")
      .select("id")
      .eq(
        "user_id",
        user.id
      )
      .eq(
        "status",
        "active"
      )
      .gt(
        "expires_at",
        new Date().toISOString()
      )
      .order(
        "expires_at",
        {
          ascending: false,
        }
      )
      .limit(1)
      .maybeSingle()

  if (membership) {
    redirect("/vip")
  }

  redirect("/pricing")
}