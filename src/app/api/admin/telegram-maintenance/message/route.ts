import {
  NextResponse,
} from "next/server"

import {
  supabaseAdmin,
} from "@/lib/supabase/admin"

import {
  createClient,
} from "@/lib/supabase/server"

export const runtime =
  "nodejs"

export const dynamic =
  "force-dynamic"

type UpdateMessageBody = {
  message?: unknown
}

function json(
  body: Record<
    string,
    unknown
  >,
  status = 200
) {
  return NextResponse.json(
    body,
    {
      status,
      headers: {
        "Cache-Control":
          "no-store, max-age=0",
      },
    }
  )
}

async function authorizeAdmin() {
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
    return {
      ok: false as const,

      response: json(
        {
          error:
            "No existe una sesión válida.",
        },
        401
      ),
    }
  }

  const {
    data: adminUser,
    error: adminError,
  } =
    await supabaseAdmin
      .from(
        "admin_users"
      )
      .select(
        "user_id"
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
      "No se pudo comprobar el administrador:",
      adminError
    )

    return {
      ok: false as const,

      response: json(
        {
          error:
            "No se pudo comprobar el acceso administrativo.",
        },
        500
      ),
    }
  }

  if (!adminUser) {
    return {
      ok: false as const,

      response: json(
        {
          error:
            "No tienes autorización administrativa.",
        },
        403
      ),
    }
  }

  return {
    ok: true as const,
  }
}

export async function POST(
  request: Request
) {
  const authorization =
    await authorizeAdmin()

  if (
    !authorization.ok
  ) {
    return authorization
      .response
  }

  let body:
    UpdateMessageBody

  try {
    body =
      (
        await request.json()
      ) as UpdateMessageBody
  } catch {
    return json(
      {
        error:
          "La solicitud no es válida.",
      },
      400
    )
  }

  if (
    typeof body.message !==
      "string"
  ) {
    return json(
      {
        error:
          "El mensaje no es válido.",
      },
      400
    )
  }

  const message =
    body.message.trim()

  if (!message) {
    return json(
      {
        error:
          "El mensaje no puede estar vacío.",
      },
      400
    )
  }

  if (
    message.length > 300
  ) {
    return json(
      {
        error:
          "El mensaje no puede superar los 300 caracteres.",
      },
      400
    )
  }

  const now =
    new Date()
      .toISOString()

  const {
    data: state,
    error,
  } =
    await supabaseAdmin
      .from(
        "telegram_service_state"
      )
      .update({
        message,
        updated_at:
          now,
      })
      .eq(
        "id",
        1
      )
      .eq(
        "maintenance",
        true
      )
      .select(
        `
          id,
          maintenance,
          message,
          maintenance_started_at,
          updated_at
        `
      )
      .maybeSingle()

  if (error) {
    console.error(
      "No se pudo actualizar el mensaje de mantenimiento:",
      error
    )

    return json(
      {
        error:
          "No se pudo actualizar el mensaje.",
      },
      500
    )
  }

  if (!state) {
    return json(
      {
        error:
          "Telegram no se encuentra en mantenimiento.",
      },
      409
    )
  }

  return json({
    ok: true,
    maintenance:
      true,
    state,
  })
}