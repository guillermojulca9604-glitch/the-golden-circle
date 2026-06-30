import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { LoginClient } from "./login-client"

type Props = {
  searchParams: Promise<{
    next?: string
  }>
}

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect(params.next || "/entry")
  }

  return <LoginClient nextPath={params.next || "/entry"} />
}