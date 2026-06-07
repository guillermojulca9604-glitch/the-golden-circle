import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

function addDays(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

export async function GET(request: Request) {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN
  const url = new URL(request.url)
  const paymentId = url.searchParams.get("payment_id")

  if (!accessToken || !paymentId) {
    return NextResponse.json({ active: false })
  }

  const { data: existing } = await supabaseAdmin
    .from("memberships")
    .select("id")
    .eq("mercado_pago_payment_id", paymentId)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ active: true })
  }

  const paymentResponse = await fetch(
    `https://api.mercadopago.com/v1/payments/${paymentId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  )

  const payment = await paymentResponse.json()

  if (!paymentResponse.ok || payment.status !== "approved") {
    return NextResponse.json({ active: false })
  }

  const reference = JSON.parse(payment.external_reference)

  await supabaseAdmin.from("memberships").insert({
    user_id: reference.user_id,
    email: reference.email,
    plan: reference.plan,
    status: "active",
    starts_at: new Date().toISOString(),
    expires_at: addDays(reference.days),
    mercado_pago_payment_id: paymentId,
  })

  return NextResponse.json({ active: true })
}