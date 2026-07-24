import { NextResponse } from "next/server"

import { supabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

const MINIMUM_USERNAME_LENGTH = 4
const MAXIMUM_USERNAME_LENGTH = 10

const CHANGE_COOLDOWN_DAYS = 7

const CHANGE_COOLDOWN_MS =
  CHANGE_COOLDOWN_DAYS *
  24 *
  60 *
  60 *
  1000

const reservedUsernamePrefixes = [
  "admin",
  "administrator",
  "administrador",
  "moderador",
  "moderator",
  "soporte",
  "support",
  "staff",
  "owner",
  "root",
  "oficial",
  "official",
  "sistema",
  "system",
  "vip",
  "golden",
  "thegolden",
  "goldencircle",
  "thegoldencircle",
  "cuenta",
  "account",
  "perfil",
  "profile",
  "usuario",
  "user",
  "seguridad",
  "security",
  "ayuda",
  "help",
  "servicio",
  "service",
  "webmaster",
  "developer",
  "desarrollador",
]

type ChangeUsernameBody = {
  username?: unknown
}

function capitalizeUsername(
  value: string
) {
  if (!value) {
    return ""
  }

  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  )
}

function sanitizeUsername(
  value: string
) {
  const withoutAccents = value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )

  const onlyLettersAndNumbers =
    withoutAccents.replace(
      /[^A-Za-z0-9]/g,
      ""
    )

  const beginningWithLetter =
    onlyLettersAndNumbers.replace(
      /^[0-9]+/,
      ""
    )

  const limitedUsername =
    beginningWithLetter.slice(
      0,
      MAXIMUM_USERNAME_LENGTH
    )

  return capitalizeUsername(
    limitedUsername
  )
}

function normalizeUsernameForSecurity(
  value: string
) {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/8/g, "b")
}

function removeTrailingNumbers(
  value: string
) {
  return value.replace(
    /[0-9]+$/,
    ""
  )
}

function isReservedUsername(
  value: string
) {
  const lowercaseValue =
    value.toLowerCase()

  const valueWithoutTrailingNumbers =
    removeTrailingNumbers(
      lowercaseValue
    )

  const normalizedValue =
    normalizeUsernameForSecurity(
      value
    )

  const normalizedWithoutTrailingNumbers =
    normalizeUsernameForSecurity(
      valueWithoutTrailingNumbers
    )

  return reservedUsernamePrefixes.some(
    (reservedName) => {
      return (
        lowercaseValue.startsWith(
          reservedName
        ) ||
        valueWithoutTrailingNumbers.startsWith(
          reservedName
        ) ||
        normalizedValue.startsWith(
          reservedName
        ) ||
        normalizedWithoutTrailingNumbers.startsWith(
          reservedName
        )
      )
    }
  )
}

function isUsernameComplete(
  value: string
) {
  if (
    value.length <
      MINIMUM_USERNAME_LENGTH ||
    value.length >
      MAXIMUM_USERNAME_LENGTH
  ) {
    return false
  }

  if (
    !/^[A-Z][A-Za-z0-9]*$/.test(
      value
    )
  ) {
    return false
  }

  return !isReservedUsername(value)
}

function calculateNextChangeDate(
  changedAt: string | null
) {
  if (!changedAt) {
    return null
  }

  const changedAtTime =
    new Date(changedAt).getTime()

  if (
    Number.isNaN(changedAtTime)
  ) {
    return null
  }

  return new Date(
    changedAtTime +
      CHANGE_COOLDOWN_MS
  )
}

function readCurrentName(
  metadata: Record<string, unknown>
) {
  const profileName =
    metadata.profile_name

  if (
    typeof profileName === "string" &&
    profileName.trim()
  ) {
    return profileName.trim()
  }

  const username =
    metadata.username

  if (
    typeof username === "string" &&
    username.trim()
  ) {
    return username.trim()
  }

  return ""
}

export async function POST(
  request: Request
) {
  const supabase =
    await createClient()

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser()

  if (
    userError ||
    !user
  ) {
    return NextResponse.json(
      {
        error:
          "No has iniciado sesión.",
      },
      {
        status: 401,
      }
    )
  }

  const {
    data: membership,
    error: membershipError,
  } =
    await supabaseAdmin
      .from("memberships")
      .select("id")
      .eq(
        "user_id",
        user.id
      )
      .eq(
        "status",
        "active"
      )
      .gt(
        "expires_at",
        new Date().toISOString()
      )
      .order(
        "expires_at",
        {
          ascending: false,
        }
      )
      .limit(1)
      .maybeSingle()

  if (membershipError) {
    console.error(
      "change-username: membership lookup failed",
      membershipError.message
    )

    return NextResponse.json(
      {
        error:
          "No pudimos comprobar tu membresía.",
      },
      {
        status: 500,
      }
    )
  }

  if (!membership) {
    return NextResponse.json(
      {
        error:
          "No tienes una membresía VIP activa.",
      },
      {
        status: 403,
      }
    )
  }

  let body: ChangeUsernameBody

  try {
    body =
      (await request.json()) as
        ChangeUsernameBody
  } catch {
    return NextResponse.json(
      {
        error:
          "La solicitud no es válida.",
      },
      {
        status: 400,
      }
    )
  }

  if (
    typeof body.username !==
    "string"
  ) {
    return NextResponse.json(
      {
        error:
          "Ingresa un nombre válido.",
      },
      {
        status: 400,
      }
    )
  }

  const username =
    sanitizeUsername(
      body.username
    )

  if (
    !isUsernameComplete(
      username
    )
  ) {
    return NextResponse.json(
      {
        error:
          isReservedUsername(
            username
          )
            ? "Ese nombre está reservado. Elige un nombre diferente."
            : "El nombre debe tener entre 4 y 10 caracteres y contener únicamente letras y números.",
      },
      {
        status: 400,
      }
    )
  }

  const currentMetadata =
    user.user_metadata &&
    typeof user.user_metadata ===
      "object"
      ? (
          user.user_metadata as Record<
            string,
            unknown
          >
        )
      : {}

  const currentName =
    readCurrentName(
      currentMetadata
    )

  if (username === currentName) {
    return NextResponse.json(
      {
        error:
          "Elige un nombre diferente al actual.",
      },
      {
        status: 400,
      }
    )
  }

  const {
    data: limits,
    error: limitsError,
  } =
    await supabaseAdmin
      .from(
        "user_account_change_limits"
      )
      .select(
        "username_changed_at"
      )
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle()

  if (limitsError) {
    console.error(
      "change-username: limits lookup failed",
      limitsError.message
    )

    return NextResponse.json(
      {
        error:
          "No pudimos comprobar cuándo cambiaste tu nombre.",
      },
      {
        status: 500,
      }
    )
  }

  const nextChangeDate =
    calculateNextChangeDate(
      limits?.username_changed_at ??
        null
    )

  if (
    nextChangeDate &&
    nextChangeDate.getTime() >
      Date.now()
  ) {
    return NextResponse.json(
      {
        error:
          "Todavía no puedes volver a cambiar tu nombre.",

        nextChangeAt:
          nextChangeDate.toISOString(),
      },
      {
        status: 429,
      }
    )
  }

  const {
    error: updateUserError,
  } =
    await supabaseAdmin
      .auth.admin
      .updateUserById(
        user.id,
        {
          user_metadata: {
            ...currentMetadata,
            profile_name:
              username,
            username,
          },
        }
      )

  if (updateUserError) {
    console.error(
      "change-username: auth update failed",
      updateUserError.message
    )

    return NextResponse.json(
      {
        error:
          "No pudimos guardar tu nombre. Inténtalo nuevamente.",
      },
      {
        status: 500,
      }
    )
  }

  const changedAt =
    new Date().toISOString()

  const {
    error: updateLimitError,
  } =
    await supabaseAdmin
      .from(
        "user_account_change_limits"
      )
      .upsert(
        {
          user_id:
            user.id,

          username,

          username_changed_at:
            changedAt,

          updated_at:
            changedAt,
        },
        {
          onConflict:
            "user_id",
        }
      )

  if (updateLimitError) {
    console.error(
      "change-username: limit update failed",
      updateLimitError.message
    )

    /*
     * El nombre ya se modificó en Auth.
     * Intentamos restaurar los metadatos
     * anteriores para no dejar un cambio
     * sin tiempo de espera registrado.
     */
    const {
      error: rollbackError,
    } =
      await supabaseAdmin
        .auth.admin
        .updateUserById(
          user.id,
          {
            user_metadata: {
              ...currentMetadata,
            },
          }
        )

    if (rollbackError) {
      console.error(
        "change-username: rollback failed",
        rollbackError.message
      )
    }

    return NextResponse.json(
      {
        error:
          "No pudimos registrar el cambio. Inténtalo nuevamente.",
      },
      {
        status: 500,
      }
    )
  }

  const nextChangeAt =
    new Date(
      new Date(
        changedAt
      ).getTime() +
        CHANGE_COOLDOWN_MS
    ).toISOString()

  return NextResponse.json({
    success: true,
    username,
    nextChangeAt,
  })
}