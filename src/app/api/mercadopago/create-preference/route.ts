import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const PLANS = {
  monthly: {
    title: "TGC Access M",
    price: 30,
    days: 30,
  },
  quarterly: {
    title: "TGC Access T",
    price: 90,
    days: 90,
  },
} as const

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { data: activeMembership } = await supabase
    .from("memberships")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .maybeSingle()

  if (activeMembership) {
    return NextResponse.json({ url: "/vip" })
  }

  const body = await request.json().catch(() => null)
  const planId = body?.plan === "quarterly" ? "quarterly" : "monthly"
  const plan = PLANS[planId]

  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN

  if (!accessToken) {
    return NextResponse.json({ error: "Falta MERCADO_PAGO_ACCESS_TOKEN" }, { status: 500 })
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://the-golden-circle-149p.vercel.app"

  const externalReference = JSON.stringify({
    user_id: user.id,
    email: user.email,
    plan: planId,
    days: plan.days,
  })

  const response = await fetch(
    "https://api.mercadopago.com/checkout/preferences",
    {
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
        payer: {
          email: user.email,
        },
        external_reference: externalReference,
        back_urls: {
          success: `${siteUrl}/payment-success`,
          failure: `${siteUrl}/checkout?plan=${planId}&country=pe`,
          pending: `${siteUrl}/payment-success`,
        },
        auto_return: "approved",
        notification_url: `${siteUrl}/api/mercadopago/webhook`,
      }),
    }
  )

  const data = await response.json()

  if (!response.ok) {
    return NextResponse.json(
      { error: "No se pudo crear el pago", details: data },
      { status: 500 }
    )
  }

  return NextResponse.json({
    url: data.init_point,
  })
}