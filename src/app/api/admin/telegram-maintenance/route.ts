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

const DEFAULT_MESSAGE =
  "The Golden Circle se encuentra temporalmente en mantenimiento."

const TELEGRAM_API =
  "https://api.telegram.org"

const DEFAULT_WEBHOOK_URL =
  "https://the-golden-circle-149p.vercel.app/api/telegram/webhook"

const TELEGRAM_ALLOWED_UPDATES = [
  "message",
  "chat_member",
  "chat_join_request",
]

type MaintenanceBody = {
  action?: unknown
  message?: unknown
}

type TelegramServiceState = {
  id: number
  maintenance: boolean
  message: string
  maintenance_started_at:
    | string
    | null
  updated_at: string
}

type TelegramLinkRow = {
  user_id: string

  telegram_user_id:
    | number
    | string
    | null

  active_invite_link:
    | string
    | null

  active_invite_message_id:
    | number
    | string
    | null
}

type TelegramApiResponse<T> = {
  ok: boolean
  result?: T
  description?: string
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

function requiredEnv(
  name: string
) {
  const value =
    process.env[name]
      ?.trim()

  if (!value) {
    throw new Error(
      `Falta ${name}.`
    )
  }

  return value
}

function getWebhookUrl() {
  const configuredUrl =
    process.env
      .TELEGRAM_WEBHOOK_URL
      ?.trim()

  if (configuredUrl) {
    return configuredUrl
  }

  return DEFAULT_WEBHOOK_URL
}

async function telegramApi<T>(
  method: string,
  body:
    Record<string, unknown>
): Promise<T> {
  const botToken =
    requiredEnv(
      "TELEGRAM_BOT_TOKEN"
    )

  const response =
    await fetch(
      `${TELEGRAM_API}/bot${botToken}/${method}`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(
            body
          ),

        cache:
          "no-store",
      }
    )

  let result:
    TelegramApiResponse<T>

  try {
    result =
      (await response.json()) as
        TelegramApiResponse<T>
  } catch {
    throw new Error(
      `Telegram respondió de forma inválida en ${method}.`
    )
  }

  if (
    !response.ok ||
    !result.ok ||
    result.result ===
      undefined
  ) {
    throw new Error(
      result.description ||
        `Telegram error: ${method}`
    )
  }

  return result.result
}

async function runInBatches<T>(
  items: T[],
  batchSize: number,
  worker:
    (
      item: T
    ) => Promise<void>
) {
  for (
    let index = 0;
    index < items.length;
    index += batchSize
  ) {
    const batch =
      items.slice(
        index,
        index +
          batchSize
      )

    await Promise.all(
      batch.map(
        worker
      )
    )
  }
}

function parseTelegramUserId(
  value:
    | number
    | string
    | null
) {
  if (value == null) {
    return null
  }

  const parsed =
    Number(value)

  if (
    !Number.isSafeInteger(
      parsed
    ) ||
    parsed <= 0
  ) {
    return null
  }

  return parsed
}

function parseMessageId(
  value:
    | number
    | string
    | null
) {
  if (value == null) {
    return null
  }

  const parsed =
    Number(value)

  if (
    !Number.isSafeInteger(
      parsed
    ) ||
    parsed <= 0
  ) {
    return null
  }

  return parsed
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
    userId: user.id,
  }
}

async function getTelegramLinks() {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        "telegram_links"
      )
      .select(
        `
          user_id,
          telegram_user_id,
          active_invite_link,
          active_invite_message_id
        `
      )

  if (error) {
    throw error
  }

  return (
    data ??
    []
  ) as TelegramLinkRow[]
}

async function deleteTelegramTokens() {
  const {
    error,
  } =
    await supabaseAdmin
      .from(
        "telegram_link_tokens"
      )
      .delete()
      .not(
        "token",
        "is",
        null
      )

  if (error) {
    throw error
  }
}

async function disconnectWebhook() {
  await telegramApi<boolean>(
    "deleteWebhook",
    {
      drop_pending_updates:
        true,
    }
  )
}

async function connectWebhook() {
  const webhookUrl =
    getWebhookUrl()

  const webhookSecret =
    requiredEnv(
      "TELEGRAM_WEBHOOK_SECRET"
    )

  await telegramApi<boolean>(
    "setWebhook",
    {
      url:
        webhookUrl,

      secret_token:
        webhookSecret,

      allowed_updates:
        TELEGRAM_ALLOWED_UPDATES,

      drop_pending_updates:
        true,
    }
  )
}

export async function GET() {
  const authorization =
    await authorizeAdmin()

  if (
    !authorization.ok
  ) {
    return authorization
      .response
  }

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        "telegram_service_state"
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
      .eq(
        "id",
        1
      )
      .maybeSingle()

  if (error) {
    console.error(
      "No se pudo consultar el estado de Telegram:",
      error
    )

    return json(
      {
        error:
          "No se pudo consultar el estado de Telegram.",
      },
      500
    )
  }

  if (!data) {
    return json(
      {
        error:
          "No existe la configuración de Telegram.",
      },
      500
    )
  }

  return json({
    ok: true,
    state:
      data as TelegramServiceState,
  })
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
    MaintenanceBody

  try {
    body =
      (
        await request.json()
      ) as MaintenanceBody
  } catch {
    return json(
      {
        error:
          "La solicitud no es válida.",
      },
      400
    )
  }

  const action =
    body.action

  if (
    action !== "enable" &&
    action !== "disable"
  ) {
    return json(
      {
        error:
          "La acción no es válida.",
      },
      400
    )
  }

  const now =
    new Date()
      .toISOString()

  /*
   * ==================================
   * ACTIVAR MANTENIMIENTO
   * ==================================
   */
  if (
    action ===
      "enable"
  ) {
    let message =
      DEFAULT_MESSAGE

    if (
      typeof body.message ===
        "string" &&
      body.message.trim()
        .length > 0
    ) {
      message =
        body.message
          .trim()
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

    /*
     * Primero cerramos las puertas
     * de la web y del webhook.
     *
     * Desde este momento:
     * - create-link queda bloqueado
     * - webhook ignora updates
     */
    const {
      data:
        maintenanceState,
      error:
        maintenanceError,
    } =
      await supabaseAdmin
        .from(
          "telegram_service_state"
        )
        .update({
          maintenance:
            true,

          message,

          maintenance_started_at:
            now,

          updated_at:
            now,
        })
        .eq(
          "id",
          1
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
        .single()

    if (maintenanceError) {
      console.error(
        "No se pudo activar el mantenimiento de Telegram:",
        maintenanceError
      )

      return json(
        {
          error:
            "No se pudo activar el mantenimiento.",
        },
        500
      )
    }

    let telegramLinks:
      TelegramLinkRow[]

    try {
      telegramLinks =
        await getTelegramLinks()
    } catch (error) {
      console.error(
        "No se pudieron consultar las vinculaciones de Telegram:",
        error
      )

      /*
       * Mantenimiento permanece
       * activo aunque falle la
       * limpieza de Telegram.
       */
      return json(
        {
          ok: false,
          maintenance: true,
          state:
            maintenanceState as
              TelegramServiceState,
          error:
            "El mantenimiento fue activado, pero no se pudieron consultar las vinculaciones de Telegram.",
        },
        500
      )
    }

    let invitationsFound =
      0

    let invitationsRevoked =
      0

    let invitationFailures =
      0

    let inviteMessagesDeleted =
      0

    let inviteMessageFailures =
      0

    let usersFound =
      0

    let usersBanned =
      0

    let userBanFailures =
      0

    const usersWithClearedInvite =
      new Set<string>()

    /*
     * ----------------------------------
     * REVOCAR INVITACIONES PENDIENTES
     * ----------------------------------
     */
    await runInBatches(
      telegramLinks,
      5,
      async (
        link
      ) => {
        const inviteLink =
          link.active_invite_link
            ?.trim() ||
          null

        const telegramUserId =
          parseTelegramUserId(
            link.telegram_user_id
          )

        const messageId =
          parseMessageId(
            link.active_invite_message_id
          )

        if (inviteLink) {
          invitationsFound +=
            1

          try {
            const channelId =
              requiredEnv(
                "TELEGRAM_CHANNEL_ID"
              )

            await telegramApi(
              "revokeChatInviteLink",
              {
                chat_id:
                  channelId,

                invite_link:
                  inviteLink,
              }
            )

            invitationsRevoked +=
              1

            usersWithClearedInvite
              .add(
                link.user_id
              )
          } catch (error) {
            invitationFailures +=
              1

            console.error(
              `No se pudo revocar la invitación de ${link.user_id}:`,
              error
            )
          }
        } else {
          usersWithClearedInvite
            .add(
              link.user_id
            )
        }

        /*
         * Eliminamos también el
         * mensaje privado que contenía
         * el botón de invitación.
         *
         * Si falla, no es crítico:
         * el enlace ya fue revocado.
         */
        if (
          telegramUserId !==
            null &&
          messageId !== null
        ) {
          try {
            await telegramApi<boolean>(
              "deleteMessage",
              {
                chat_id:
                  telegramUserId,

                message_id:
                  messageId,
              }
            )

            inviteMessagesDeleted +=
              1
          } catch (error) {
            inviteMessageFailures +=
              1

            console.error(
              `No se pudo eliminar el mensaje de invitación de ${link.user_id}:`,
              error
            )
          }
        }
      }
    )

    /*
     * Limpiamos en Supabase únicamente
     * las invitaciones que ya no
     * representan un riesgo.
     *
     * Si Telegram no permitió revocar
     * alguna, conservamos su registro
     * para no perderla.
     */
    const clearedInviteUserIds =
      Array.from(
        usersWithClearedInvite
      )

    if (
      clearedInviteUserIds
        .length > 0
    ) {
      const {
        error:
          clearInviteError,
      } =
        await supabaseAdmin
          .from(
            "telegram_links"
          )
          .update({
            active_invite_link:
              null,

            active_invite_expires_at:
              null,

            active_invite_message_id:
              null,

            updated_at:
              now,
          })
          .in(
            "user_id",
            clearedInviteUserIds
          )

      if (clearInviteError) {
        console.error(
          "No se pudieron limpiar las invitaciones en Supabase:",
          clearInviteError
        )
      }
    }

    /*
     * ----------------------------------
     * EXPULSAR VIP DEL CANAL
     * ----------------------------------
     *
     * Durante mantenimiento hacemos
     * solamente BAN.
     *
     * NO hacemos unban todavía.
     *
     * De esa forma, aunque exista
     * accidentalmente un enlace viejo,
     * ese Telegram no puede volver a
     * entrar mientras dure el
     * mantenimiento.
     */
    const telegramUserIds =
      Array.from(
        new Set(
          telegramLinks
            .map(
              (
                link
              ) =>
                parseTelegramUserId(
                  link.telegram_user_id
                )
            )
            .filter(
              (
                value
              ): value is number =>
                value !== null
            )
        )
      )

    usersFound =
      telegramUserIds.length

    await runInBatches(
      telegramUserIds,
      5,
      async (
        telegramUserId
      ) => {
        try {
          const channelId =
            requiredEnv(
              "TELEGRAM_CHANNEL_ID"
            )

          await telegramApi<boolean>(
            "banChatMember",
            {
              chat_id:
                channelId,

              user_id:
                telegramUserId,
            }
          )

          usersBanned +=
            1
        } catch (error) {
          userBanFailures +=
            1

          console.error(
            `No se pudo expulsar/bloquear Telegram ${telegramUserId}:`,
            error
          )
        }
      }
    )

    /*
     * ----------------------------------
     * INVALIDAR TODOS LOS TOKENS
     * ----------------------------------
     *
     * Nadie podrá reutilizar un
     * /start generado antes del
     * mantenimiento.
     */
    let tokensCleared =
      false

    try {
      await deleteTelegramTokens()

      tokensCleared =
        true
    } catch (error) {
      console.error(
        "No se pudieron eliminar los tokens de Telegram:",
        error
      )
    }

    /*
     * ----------------------------------
     * DESCONECTAR EL WEBHOOK
     * ----------------------------------
     *
     * Después de esto Telegram deja
     * de enviar /start y demás updates
     * a Vercel.
     */
    let webhookDisconnected =
      false

    let webhookDisconnectError:
      string |
      null =
      null

    try {
      await disconnectWebhook()

      webhookDisconnected =
        true
    } catch (error) {
      webhookDisconnectError =
        error instanceof Error
          ? error.message
          : "Error desconocido."

      console.error(
        "No se pudo desconectar el webhook de Telegram:",
        error
      )
    }

    const cleanupComplete =
      invitationFailures ===
        0 &&
      userBanFailures ===
        0 &&
      tokensCleared &&
      webhookDisconnected

    return json({
      ok: true,

      maintenance:
        true,

      state:
        maintenanceState as
          TelegramServiceState,

      cleanupComplete,

      cleanup: {
        invitationsFound,
        invitationsRevoked,
        invitationFailures,

        inviteMessagesDeleted,
        inviteMessageFailures,

        usersFound,
        usersBanned,
        userBanFailures,

        tokensCleared,

        webhookDisconnected,

        webhookDisconnectError,
      },
    })
  }

  /*
   * ==================================
   * QUITAR MANTENIMIENTO
   * ==================================
   *
   * IMPORTANTE:
   *
   * Primero restauramos Telegram.
   * Solo al final ponemos
   * maintenance = false.
   */
  let telegramLinks:
    TelegramLinkRow[]

  try {
    telegramLinks =
      await getTelegramLinks()
  } catch (error) {
    console.error(
      "No se pudieron consultar las vinculaciones antes de reabrir Telegram:",
      error
    )

    return json(
      {
        error:
          "No se pudo preparar la reapertura de Telegram. El mantenimiento continúa activo.",
      },
      500
    )
  }

  /*
   * Primero volvemos a conectar el
   * webhook mientras maintenance
   * todavía sigue en true.
   *
   * Si Telegram envía algo durante
   * estos segundos, nuestro webhook
   * lo ignora.
   */
  try {
    await connectWebhook()
  } catch (error) {
    console.error(
      "No se pudo restaurar el webhook de Telegram:",
      error
    )

    return json(
      {
        error:
          "No se pudo restaurar el webhook de Telegram. El mantenimiento continúa activo.",
      },
      502
    )
  }

  /*
   * Quitamos los bans realizados
   * durante el mantenimiento.
   *
   * Todavía NO borramos los IDs
   * porque los necesitamos para
   * realizar este unban.
   */
  const telegramUserIds =
    Array.from(
      new Set(
        telegramLinks
          .map(
            (
              link
            ) =>
              parseTelegramUserId(
                link.telegram_user_id
              )
          )
          .filter(
            (
              value
            ): value is number =>
              value !== null
          )
      )
    )

  let usersUnbanned =
    0

  let userUnbanFailures =
    0

  await runInBatches(
    telegramUserIds,
    5,
    async (
      telegramUserId
    ) => {
      try {
        const channelId =
          requiredEnv(
            "TELEGRAM_CHANNEL_ID"
          )

        await telegramApi<boolean>(
          "unbanChatMember",
          {
            chat_id:
              channelId,

            user_id:
              telegramUserId,

            only_if_banned:
              true,
          }
        )

        usersUnbanned +=
          1
      } catch (error) {
        userUnbanFailures +=
          1

        console.error(
          `No se pudo desbloquear Telegram ${telegramUserId}:`,
          error
        )
      }
    }
  )

  /*
   * Si no pudimos quitar todos los
   * bloqueos, NO abrimos Telegram.
   *
   * Así no dejamos usuarios con un
   * VIP activo pero permanentemente
   * bloqueados en el canal.
   */
  if (
    userUnbanFailures > 0
  ) {
    return json(
      {
        ok: false,

        maintenance:
          true,

        error:
          "No se pudieron restaurar todos los accesos de Telegram. El mantenimiento continúa activo.",

        restoration: {
          usersFound:
            telegramUserIds.length,

          usersUnbanned,

          userUnbanFailures,
        },
      },
      502
    )
  }

  /*
   * Cualquier token anterior queda
   * definitivamente eliminado.
   */
  try {
    await deleteTelegramTokens()
  } catch (error) {
    console.error(
      "No se pudieron limpiar los tokens antes de reabrir Telegram:",
      error
    )

    return json(
      {
        error:
          "No se pudieron limpiar los accesos anteriores. El mantenimiento continúa activo.",
      },
      500
    )
  }

  /*
   * ==================================
   * REINICIO DE TELEGRAM
   * ==================================
   *
   * Todos los VIP conservan:
   *
   * - usuario web
   * - membresía
   * - fecha de expiración
   * - días restantes
   *
   * Pero Telegram empieza desde cero.
   *
   * Al volver al VIP deberán usar
   * nuevamente "Vincular cuenta".
   */
  const {
    error:
      resetLinksError,
  } =
    await supabaseAdmin
      .from(
        "telegram_links"
      )
      .update({
        telegram_user_id:
          null,

        telegram_username:
          null,

        membership_id:
          null,

        linked_at:
          null,

        last_changed_at:
          null,

        change_count:
          0,

        active_invite_link:
          null,

        active_invite_expires_at:
          null,

        active_invite_message_id:
          null,

        updated_at:
          now,
      })
      .not(
        "user_id",
        "is",
        null
      )

  if (resetLinksError) {
    console.error(
      "No se pudieron reiniciar las vinculaciones de Telegram:",
      resetLinksError
    )

    return json(
      {
        error:
          "No se pudieron reiniciar las vinculaciones de Telegram. El mantenimiento continúa activo.",
      },
      500
    )
  }

  /*
   * Solo ahora:
   *
   * - webhook funcionando
   * - bans retirados
   * - tokens viejos eliminados
   * - Telegram reiniciado
   *
   * abrimos nuevamente el servicio.
   */
  const {
    data:
      restoredState,
    error:
      restoreStateError,
  } =
    await supabaseAdmin
      .from(
        "telegram_service_state"
      )
      .update({
        maintenance:
          false,

        maintenance_started_at:
          null,

        updated_at:
          now,
      })
      .eq(
        "id",
        1
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
      .single()

  if (restoreStateError) {
    console.error(
      "No se pudo quitar el mantenimiento de Telegram:",
      restoreStateError
    )

    return json(
      {
        error:
          "Telegram fue preparado, pero no se pudo cambiar el estado de mantenimiento.",
      },
      500
    )
  }

  return json({
    ok: true,

    maintenance:
      false,

    state:
      restoredState as
        TelegramServiceState,

    restoration: {
      usersFound:
        telegramUserIds.length,

      usersUnbanned,

      telegramLinksReset:
        true,

      tokensCleared:
        true,

      webhookConnected:
        true,
    },
  })
}