import { redirect } from "next/navigation"

type Props = {
  searchParams: Promise<{
    step?: string
    plan?: string
  }>
}

export default async function AccessPage({
  searchParams,
}: Props) {
  const params =
    await searchParams

  if (
    params.step === "checkout"
  ) {
    const plan =
      params.plan === "quarterly"
        ? "quarterly"
        : "monthly"

    redirect(
      `/checkout?plan=${plan}`
    )
  }

  if (
    params.step === "pricing" ||
    params.step === "vip"
  ) {
    redirect("/pricing")
  }

  redirect("/login")
}