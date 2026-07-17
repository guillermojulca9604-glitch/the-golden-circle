import { redirect } from "next/navigation"

import { supabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { LoginClient } from "./login-client"

export const dynamic =
  "force-dynamic"

export default async function LoginPage() {
  const supabase =
    await createClient()

  const {
    data: { user },
  } =
    await supabase.auth.getUser()

  /*
   * Un usuario que ya inició sesión
   * no vuelve a ver Login.
   */
  if (user) {
    const adminEmail =
      process.env.ADMIN_EMAIL
        ?.trim()
        .toLowerCase()

    if (
      adminEmail &&
      user.email?.toLowerCase() ===
        adminEmail
    ) {
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

  return (
    <LoginClient nextPath="/entry" />
  )
}