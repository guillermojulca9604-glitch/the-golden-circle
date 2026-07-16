import { redirect } from "next/navigation"

type Props = {
  searchParams: Promise<{
    plan?: string
  }>
}

export default async function CheckoutPage({
  searchParams,
}: Props) {
  const params =
    await searchParams

  const plan =
    params.plan === "quarterly"
      ? "quarterly"
      : "monthly"

  redirect(
    `/access?step=checkout&plan=${plan}`
  )
}