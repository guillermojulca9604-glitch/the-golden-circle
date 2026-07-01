import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

const PLANS = {
  monthly: { title: "TGC Access M", price: 30, days: 30 },
  quarterly: { title: "TGC Access T", price: 90, days: 90 },
} as const

function addMinutes(minutes: number) {
  const date = new Date()
  date.setMinutes(date.getMinutes() + minutes)
  return date.toISOString()
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const now = new Date().toISOString()

  const { data: activeMembership } = await supabaseAdmin
    .from("memberships")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .gt("expires_at", now)
    .limit(1)
    .maybeSingle()

  if (activeMembership) {
    return NextResponse.json({ url: "/vip" })
  }

  const { data: pendingAttempt } = await supabaseAdmin
    .from("payment_attempts")
    .select("id, payment_url")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .gt("expires_at", now)
    .not("payment_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (pendingAttempt?.payment_url) {
    return NextResponse.json({ url: pendingAttempt.payment_url })
  }

  const body = await request.json().catch(() => null)
  const planId = body?.plan === "quarterly" ? "quarterly" : "monthly"
  const plan = PLANS[planId]

  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN

  if (!accessToken) {
    return NextResponse.json({ error: "Falta token" }, { status: 500 })
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://the-golden-circle-149p.vercel.app"

  const { data: attempt, error: attemptError } = await supabaseAdmin
    .from("payment_attempts")
    .insert({
      user_id: user.id,
      email: user.email,
      plan: planId,
      status: "pending",
      expires_at: addMinutes(20),
    })
    .select("id")
    .single()

  if (attemptError || !attempt) {
    return NextResponse.json(
      { error: "No se pudo crear intento" },
      { status: 500 }
    )
  }

  const externalReference = JSON.stringify({
    attempt_id: attempt.id,
    user_id: user.id,
    email: user.email,
    plan: planId,
    days: plan.days,
  })

  const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: [
        {
          title: plan.title,
          quantity: 1,
          unit_price: plan.price,
          currency_id: "PEN",
        },
      ],
      payer: { email: user.email },
      external_reference: externalReference,
      back_urls: {
        success: `${siteUrl}/payment-success`,
        failure: `${siteUrl}/access?step=checkout&plan=${planId}`,
        pending: `${siteUrl}/payment-success`,
      },
      auto_return: "approved",
      notification_url: `${siteUrl}/api/mercadopago/webhook`,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    await supabaseAdmin
      .from("payment_attempts")
      .update({ status: "failed" })
      .eq("id", attempt.id)

    return NextResponse.json(
      { error: "No se pudo crear pago" },
      { status: 500 }
    )
  }

  await supabaseAdmin
    .from("payment_attempts")
    .update({
      payment_url: data.init_point,
      preference_id: data.id,
    })
    .eq("id", attempt.id)

  return NextResponse.json({ url: data.init_point })
}