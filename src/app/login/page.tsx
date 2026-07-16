import { redirect } from "next/navigation"

export default function LoginPage() {
  redirect(
    "/access?step=login"
  )
}