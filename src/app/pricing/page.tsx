import { redirect } from "next/navigation"

export default function PricingPage() {
  redirect(
    "/access?step=pricing"
  )
}