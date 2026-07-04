import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AccessFlow } from "./access-flow"

type Props = {
  searchParams: Promise<{
    step?: string
    plan?: string
  }>
}

export default async function AccessPage({ searchParams }: Props) {
  const params = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let initialStep = params.step || "login"

  if (!user) {
    initialStep = "login"
  }

  if (user) {
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

    if (!["pricing", "checkout"].includes(initialStep)) {
      initialStep = "pricing"
    }
  }

  const initialPlan = params.plan === "quarterly" ? "quarterly" : "monthly"

  return (
    <AccessFlow
      initialStep={initialStep}
      initialPlan={initialPlan}
      initialEmail={user?.email || null}
    />
  )
}