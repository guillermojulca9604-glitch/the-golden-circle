import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function POST(req: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    console.log("USER:", user)
    
    if (!user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const formData = await req.formData()

    const file = formData.get("file") as File | null
    const plan = formData.get("plan") as string
    const country = formData.get("country") as string

    if (!file) {
      return NextResponse.json(
        { error: "Archivo requerido" },
        { status: 400 }
      )
    }

    const fileExt = file.name.split(".").pop() || "jpg"
    const fileName = `${user.id}-${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from("payment-proofs")
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      )
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage
      .from("payment-proofs")
      .getPublicUrl(fileName)

    const { error: insertError } = await supabaseAdmin
      .from("payment_proofs")
      .insert({
        user_id: user.id,
        email: user.email ?? "",
        plan,
        country,
        proof_url: publicUrl,
      })

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error("UPLOAD PROOF ERROR:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error inesperado",
      },
      { status: 500 }
    )
  }
}