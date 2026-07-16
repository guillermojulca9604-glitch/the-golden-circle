import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { AccessFlow } from "./access-flow"

type Props = {
  searchParams: Promise<{
    step?: string
    plan?: string
  }>
}

const PUBLIC_STEPS =
  new Set([
    "login",
    "register",
  ])

const PRIVATE_STEPS =
  new Set([
    "pricing",
    "checkout",
  ])

export default async function AccessPage({
  searchParams,
}: Props) {
  const params =
    await searchParams

  const supabase =
    await createClient()

  const {
    data: { user },
  } =
    await supabase.auth.getUser()

  let initialStep =
    params.step ?? "login"

  if (!user) {
    if (
      !PUBLIC_STEPS.has(
        initialStep
      )
    ) {
      redirect("/")
    }

    initialStep =
      PUBLIC_STEPS.has(
        initialStep
      )
        ? initialStep
        : "login"
  }

  if (user) {
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

    initialStep =
      PRIVATE_STEPS.has(
        initialStep
      )
        ? initialStep
        : "pricing"
  }

  const initialPlan =
    params.plan ===
    "quarterly"
      ? "quarterly"
      : "monthly"

  return (
    <AccessFlow
      initialStep={
        initialStep
      }
      initialPlan={
        initialPlan
      }
      initialEmail={
        user?.email ?? null
      }
    />
  )
}