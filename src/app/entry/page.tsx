import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function EntryPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .maybeSingle()

  if (membership) {
    redirect("/vip")
  }

  redirect("/pricing")
}