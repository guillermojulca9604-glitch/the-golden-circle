import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

function addDays(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

export async function POST(request: Request) {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN

  if (!accessToken) {
    return NextResponse.json({ error: "Falta token" }, { status: 500 })
  }

  const url = new URL(request.url)
  const body = await request.json().catch(() => null)

  const paymentId =
    body?.data?.id ||
    body?.id ||
    url.searchParams.get("data.id") ||
    url.searchParams.get("id")

  if (!paymentId) {
    return NextResponse.json({ received: true })
  }

  const { data: existing } = await supabaseAdmin
    .from("memberships")
    .select("id")
    .eq("mercado_pago_payment_id", String(paymentId))
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ received: true, duplicated: true })
  }

  const paymentResponse = await fetch(
    `https://api.mercadopago.com/v1/payments/${paymentId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  const payment = await paymentResponse.json()

  if (!paymentResponse.ok || payment.status !== "approved") {
    return NextResponse.json({ received: true, status: payment.status })
  }

  let reference: {
    user_id: string
    email: string
    plan: "monthly" | "quarterly"
    days: number
  } | null = null

  try {
    reference = JSON.parse(payment.external_reference || "{}")
  } catch {
    reference = null
  }

  if (!reference?.user_id || !reference?.email || !reference?.plan) {
    return NextResponse.json({ error: "Referencia inválida" }, { status: 400 })
  }

  await supabaseAdmin
    .from("memberships")
    .update({
      status: "disabled",
    })
    .eq("user_id", reference.user_id)
    .eq("status", "active")

  await supabaseAdmin.from("memberships").insert({
    user_id: reference.user_id,
    email: reference.email,
    plan: reference.plan,
    status: "active",
    starts_at: new Date().toISOString(),
    expires_at: addDays(reference.days),
    mercado_pago_payment_id: String(paymentId),
  })

  await supabaseAdmin.from("admin_logs").insert({
    user_id: reference.user_id,
    action: `mercadopago_approved_${reference.plan}`,
    note: `payment_id:${paymentId}`,
  })

  return NextResponse.json({ received: true, activated: true })
}

export async function GET() {
  return NextResponse.json({ ok: true })
}