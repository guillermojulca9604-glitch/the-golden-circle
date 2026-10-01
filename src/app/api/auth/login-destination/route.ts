import {
  NextResponse,
} from "next/server"

import {
  supabaseAdmin,
} from "@/lib/supabase/admin"

import {
  createClient,
} from "@/lib/supabase/server"

export const dynamic =
  "force-dynamic"

const NO_STORE_HEADERS = {
  "Cache-Control":
    "no-store, no-cache, must-revalidate, max-age=0",
}

type ResponseBody = {
  destination?: string | null
  isAdmin?: boolean
  error?: string
}

function createResponse(
  body: ResponseBody,
  status = 200
) {
  return NextResponse.json(
    body,
    {
      status,

      headers:
        NO_STORE_HEADERS,
    }
  )
}

export async function GET() {
  const supabase =
    await createClient()

  const {
    data: {
      user,
    },
    error: userError,
  } =
    await supabase.auth
      .getUser()

  if (
    userError ||
    !user
  ) {
    return createResponse(
      {
        error:
          "No existe una sesión válida.",
      },
      401
    )
  }

  const {
    data: adminUser,
    error: adminError,
  } =
    await supabaseAdmin
      .from("admin_users")
      .select(
        `
          user_id,
          is_active
        `
      )
      .eq(
        "user_id",
        user.id
      )
      .eq(
        "is_active",
        true
      )
      .maybeSingle()

  if (adminError) {
    console.error(
      "No se pudo comprobar el acceso administrativo:",
      adminError
    )

    return createResponse(
      {
        error:
          "No se pudo comprobar el acceso administrativo.",
      },
      500
    )
  }

  const isAdmin =
    Boolean(adminUser)

  return createResponse({
    isAdmin,

    destination:
      isAdmin
        ? "/admin"
        : null,
  })
}