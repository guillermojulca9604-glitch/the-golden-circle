import {
  createClient as createVerificationClient,
} from "@supabase/supabase-js"
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

const MINIMUM_PASSWORD_LENGTH = 12
const MAXIMUM_PASSWORD_LENGTH = 24

type ChangePasswordBody = {
  currentPassword?: unknown
  newPassword?: unknown
  confirmPassword?: unknown
}

function json(
  body: Record<string, unknown>,
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

export async function POST(
  request: Request
) {
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
    !user ||
    !user.email
  ) {
    return json(
      {
        error:
          "No existe una sesión válida.",
      },
      401
    )
  }

  /*
   * Comprueba que el UID de la sesión
   * pertenece a un administrador activo.
   */
  const {
    data: adminUser,
    error: adminError,
  } =
    await supabaseAdmin
      .from("admin_users")
      .select("user_id")
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

    return json(
      {
        error:
          "No se pudo comprobar el acceso administrativo.",
      },
      500
    )
  }

  if (!adminUser) {
    return json(
      {
        error:
          "No tienes autorización administrativa.",
      },
      403
    )
  }

  let body: ChangePasswordBody

  try {
    body =
      (
        await request.json()
      ) as ChangePasswordBody
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
    typeof body.currentPassword !==
      "string" ||
    !body.currentPassword
  ) {
    return json(
      {
        error:
          "Ingresa tu contraseña actual.",
      },
      400
    )
  }

  if (
    typeof body.newPassword !==
      "string" ||
    !body.newPassword
  ) {
    return json(
      {
        error:
          "Ingresa la nueva contraseña.",
      },
      400
    )
  }

  if (
    typeof body.confirmPassword !==
      "string" ||
    !body.confirmPassword
  ) {
    return json(
      {
        error:
          "Confirma la nueva contraseña.",
      },
      400
    )
  }

  const currentPassword =
    body.currentPassword

  const newPassword =
    body.newPassword

  const confirmPassword =
    body.confirmPassword

  if (
    newPassword.length <
      MINIMUM_PASSWORD_LENGTH ||
    newPassword.length >
      MAXIMUM_PASSWORD_LENGTH
  ) {
    return json(
      {
        error:
          "La nueva contraseña debe tener entre 12 y 24 caracteres.",
      },
      400
    )
  }

  if (
    newPassword !==
      confirmPassword
  ) {
    return json(
      {
        error:
          "Las nuevas contraseñas no coinciden.",
      },
      400
    )
  }

  if (
    newPassword ===
      currentPassword
  ) {
    return json(
      {
        error:
          "La nueva contraseña debe ser diferente a la actual.",
      },
      400
    )
  }

  const supabaseUrl =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL

  const anonKey =
    process.env
      .NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (
    !supabaseUrl ||
    !anonKey
  ) {
    console.error(
      "Faltan variables públicas de Supabase."
    )

    return json(
      {
        error:
          "No se pudo comprobar la contraseña actual.",
      },
      500
    )
  }

  /*
   * Se utiliza un cliente aislado para
   * comprobar la contraseña actual.
   *
   * Esto no reemplaza ni modifica la
   * sesión administrativa del navegador.
   */
  const verificationClient =
    createVerificationClient(
      supabaseUrl,
      anonKey,
      {
        auth: {
          persistSession:
            false,

          autoRefreshToken:
            false,

          detectSessionInUrl:
            false,
        },
      }
    )

  const {
    error: verificationError,
  } =
    await verificationClient
      .auth
      .signInWithPassword({
        email: user.email,
        password:
          currentPassword,
      })

  if (verificationError) {
    return json(
      {
        error:
          "La contraseña actual no es correcta.",
      },
      400
    )
  }

  /*
   * El administrador puede cambiar
   * su contraseña sin límites de días.
   *
   * No se utiliza la tabla de límites
   * correspondiente a los usuarios VIP.
   */
  const {
    error: updateError,
  } =
    await supabaseAdmin
      .auth
      .admin
      .updateUserById(
        user.id,
        {
          password:
            newPassword,
        }
      )

  if (updateError) {
    console.error(
      "No se pudo cambiar la contraseña administrativa:",
      updateError
    )

    return json(
      {
        error:
          "No se pudo cambiar la contraseña. Inténtalo nuevamente.",
      },
      500
    )
  }

  return json({
    success: true,

    message:
      "Contraseña cambiada correctamente.",
  })
}