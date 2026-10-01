import "server-only"

import {
  redirect,
} from "next/navigation"

import {
  supabaseAdmin,
} from "@/lib/supabase/admin"

import {
  createClient,
} from "@/lib/supabase/server"

export type AdminAccount = {
  userId: string
  email: string | null
  displayName: string
}

type AdminUserRow = {
  user_id: string
  display_name: string
  is_active: boolean
}

export async function requireAdmin():
  Promise<AdminAccount> {
  const supabase =
    await createClient()

  const {
    data: {
      user,
    },
    error: userError,
  } =
    await supabase.auth
      .getUser()

  if (
    userError ||
    !user
  ) {
    redirect("/")
  }

  const {
    data,
    error: adminError,
  } =
    await supabaseAdmin
      .from("admin_users")
      .select(
        `
          user_id,
          display_name,
          is_active
        `
      )
      .eq(
        "user_id",
        user.id
      )
      .eq(
        "is_active",
        true
      )
      .maybeSingle()

  if (
    adminError ||
    !data
  ) {
    redirect("/")
  }

  const admin =
    data as AdminUserRow

  return {
    userId:
      admin.user_id,

    email:
      user.email ?? null,

    displayName:
      admin.display_name,
  }
}