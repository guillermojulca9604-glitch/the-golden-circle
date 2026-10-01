import { NextResponse } from "next/server"

import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"

export const dynamic = "force-dynamic"

type TelegramUser = {
  id: number
  is_bot?: boolean
  first_name?: string
  last_name?: string
  username?: string
}

type TelegramChat = {
  id: number
  type: string
}

type TelegramMessage = {
  message_id: number
  text?: string
  chat: TelegramChat
  from?: TelegramUser
}

type TelegramUpdate = {
  update_id: number
  message?: TelegramMessage
}

type TelegramApiResponse<T> = {
  ok: boolean
  result?: T
  description?: string
}

type TelegramInviteLink = {
  invite_link: string
  expire_date?: number
  member_limit?: number
}

type TokenRow = {
  token: string
  user_id: string
  membership_id: string
  expires_at: string
  used_at: string | null
}

type ExistingLink = {
  user_id: string

  telegram_user_id:
    | number
    | string
    | null

  telegram_username:
    | string
    | null

  membership_id:
    | string
    | null

  linked_at:
    | string
    | null

  last_changed_at:
    | string
    | null

  change_count: number
}

const TELEGRAM_API =
  "https://api.telegram.org"

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

function requiredEnv(
  name: string
) {
  const value =
    process.env[name]?.trim()

  if (!value) {
    throw new Error(
      `Falta ${name}.`
    )
  }

  return value
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
        cache: "no-store",
      }
    )

  const result =
    (await response.json()) as
      TelegramApiResponse<T>

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

async function sendMessage(
  chatId: number,
  text: string,
  button?: {
    text: string
    url: string
  }
) {
  const body:
    Record<string, unknown> = {
      chat_id:
        chatId,

      text,

      disable_web_page_preview:
        true,
    }

  if (button) {
    body.reply_markup = {
      inline_keyboard: [
        [
          {
            text:
              button.text,

            url:
              button.url,
          },
        ],
      ],
    }
  }

  await telegramApi(
    "sendMessage",
    body
  )
}

async function deleteIncomingMessage(
  chatId: number,
  messageId: number
) {
  try {
    await telegramApi<boolean>(
      "deleteMessage",
      {
        chat_id:
          chatId,

        message_id:
          messageId,
      }
    )
  } catch (error) {
    console.error(
      "No se pudo ocultar el mensaje /start:",
      error
    )
  }
}

async function revokeInviteLink(
  inviteLink: string
) {
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
  } catch (error) {
    console.error(
      "No se pudo revocar la invitación:",
      error
    )
  }
}

function getStartToken(
  text: string
) {
  const match =
    text
      .trim()
      .match(
        /^\/start(?:@\w+)?(?:\s+([A-Za-z0-9_-]{1,64}))?\s*$/
      )

  return match?.[1] ?? null
}

async function removeOldTelegramAccount(
  telegramUserId: number
) {
  const channelId =
    requiredEnv(
      "TELEGRAM_CHANNEL_ID"
    )

  await telegramApi(
    "banChatMember",
    {
      chat_id:
        channelId,

      user_id:
        telegramUserId,
    }
  )

  await telegramApi(
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
}

export async function POST(
  request: Request
) {
  let chatId:
    | number
    | null = null

  try {
    /*
     * Verificar que la petición
     * realmente procede del webhook
     * configurado en Telegram.
     */
    const expectedSecret =
      requiredEnv(
        "TELEGRAM_WEBHOOK_SECRET"
      )

    const receivedSecret =
      request.headers.get(
        "x-telegram-bot-api-secret-token"
      )

    if (
      !receivedSecret ||
      receivedSecret !==
        expectedSecret
    ) {
      return json(
        {
          ok: false,
        },
        401
      )
    }

    const update =
      (await request.json()) as
        TelegramUpdate

    const message =
      update.message

    /*
     * Solo mensajes privados
     * enviados por personas.
     */
    if (
      !message ||
      !message.from ||
      message.from.is_bot ||
      message.chat.type !==
        "private"
    ) {
      return json({
        ok: true,
      })
    }

    chatId =
      message.chat.id

    const text =
      message.text?.trim() ??
      ""

    if (
      !text.startsWith(
        "/start"
      )
    ) {
      return json({
        ok: true,
      })
    }

    /*
     * Ocultar el comando /start
     * para mantener limpio el chat.
     *
     * Si Telegram no pudiera
     * eliminarlo por algún motivo,
     * la vinculación continúa.
     */
    await deleteIncomingMessage(
      chatId,
      message.message_id
    )

    const token =
      getStartToken(
        text
      )

    /*
     * Si alguien entra directamente
     * al bot o comparte el bot,
     * no tendrá token.
     *
     * No se genera acceso al canal.
     * Solo se muestra el botón
     * para regresar a la web.
     */
    if (!token) {
      await sendMessage(
        chatId,
        [
          "Acceso exclusivo para miembros de The Golden Circle.",
          "",
          "Ingresa a tu cuenta VIP para obtener acceso.",
        ].join("\n"),
        {
          text:
            "Ir a la página",

          url:
            "https://the-golden-circle-149p.vercel.app",
        }
      )

      return json({
        ok: true,
      })
    }

    const now =
      new Date()

    const nowIso =
      now.toISOString()

    /*
     * Buscar token.
     */
    const {
      data: tokenRow,
      error: tokenError,
    } =
      await supabaseAdmin
        .from(
          "telegram_link_tokens"
        )
        .select(
          "token,user_id,membership_id,expires_at,used_at"
        )
        .eq(
          "token",
          token
        )
        .maybeSingle<TokenRow>()

    if (tokenError) {
      throw tokenError
    }

    if (!tokenRow) {
      await sendMessage(
        chatId,
        [
          "Este enlace no es válido.",
          "",
          "Vuelve a tu cuenta VIP y genera uno nuevo.",
        ].join("\n"),
        {
          text:
            "Ir a la página",

          url:
            "https://the-golden-circle-149p.vercel.app",
        }
      )

      return json({
        ok: true,
      })
    }

    /*
     * Token ya utilizado.
     *
     * Se rechaza silenciosamente
     * para evitar mostrar mensajes
     * viejos cuando Telegram procesa
     * un /start anterior.
     */
    if (tokenRow.used_at) {
      return json({
        ok: true,
      })
    }

    /*
     * Token vencido.
     */
    const expiresAt =
      new Date(
        tokenRow.expires_at
      )

    if (
      Number.isNaN(
        expiresAt.getTime()
      ) ||
      expiresAt.getTime() <=
        now.getTime()
    ) {
      await sendMessage(
        chatId,
        [
          "Este enlace ha vencido.",
          "",
          "Vuelve a tu cuenta VIP y pulsa nuevamente “Unirse a Telegram”.",
        ].join("\n"),
        {
          text:
            "Ir a la página",

          url:
            "https://the-golden-circle-149p.vercel.app",
        }
      )

      return json({
        ok: true,
      })
    }

    /*
     * Volvemos a verificar
     * membresía.
     *
     * Tener un token válido
     * por sí solo NO basta.
     */
    const {
      data: membership,
      error: membershipError,
    } =
      await supabaseAdmin
        .from(
          "memberships"
        )
        .select(
          "id,user_id,status,expires_at"
        )
        .eq(
          "id",
          tokenRow.membership_id
        )
        .eq(
          "user_id",
          tokenRow.user_id
        )
        .eq(
          "status",
          "active"
        )
        .gt(
          "expires_at",
          nowIso
        )
        .maybeSingle()

    if (membershipError) {
      throw membershipError
    }

    if (!membership) {
      await sendMessage(
        chatId,
        [
          "Tu membresía VIP ya no está activa.",
          "",
          "No se puede generar acceso al canal.",
        ].join("\n"),
        {
          text:
            "Ir a la página",

          url:
            "https://the-golden-circle-149p.vercel.app",
        }
      )

      return json({
        ok: true,
      })
    }

    const telegramUserId =
      message.from.id

    const telegramUsername =
      message.from.username
        ?.trim() ||
      null

    /*
     * Una misma cuenta Telegram
     * no puede vincularse con dos
     * cuentas VIP diferentes.
     */
    const {
      data:
        telegramUsedByAnotherUser,
      error:
        telegramUsedError,
    } =
      await supabaseAdmin
        .from(
          "telegram_links"
        )
        .select(
          "user_id"
        )
        .eq(
          "telegram_user_id",
          telegramUserId
        )
        .maybeSingle()

    if (telegramUsedError) {
      throw telegramUsedError
    }

    if (
      telegramUsedByAnotherUser &&
      telegramUsedByAnotherUser
        .user_id !==
        tokenRow.user_id
    ) {
      await sendMessage(
        chatId,
        [
          "Esta cuenta de Telegram ya está vinculada a otra cuenta VIP.",
          "",
          "No se realizó ningún cambio.",
        ].join("\n"),
        {
          text:
            "Ir a la página",

          url:
            "https://the-golden-circle-149p.vercel.app",
        }
      )

      return json({
        ok: true,
      })
    }

    /*
     * Ver vinculación actual de
     * la cuenta VIP.
     */
    const {
      data: currentLink,
      error: currentLinkError,
    } =
      await supabaseAdmin
        .from(
          "telegram_links"
        )
        .select(
          "user_id,telegram_user_id,telegram_username,membership_id,linked_at,last_changed_at,change_count"
        )
        .eq(
          "user_id",
          tokenRow.user_id
        )
        .maybeSingle<ExistingLink>()

    if (currentLinkError) {
      throw currentLinkError
    }

    /*
     * Consumir token.
     *
     * Solo puede pasar de NULL
     * a usado una vez.
     */
    const {
      data: consumedToken,
      error: consumeError,
    } =
      await supabaseAdmin
        .from(
          "telegram_link_tokens"
        )
        .update({
          used_at:
            nowIso,
        })
        .eq(
          "token",
          token
        )
        .is(
          "used_at",
          null
        )
        .gt(
          "expires_at",
          nowIso
        )
        .select(
          "token"
        )
        .maybeSingle()

    if (consumeError) {
      throw consumeError
    }

    if (!consumedToken) {
      /*
       * Si otro intento consumió
       * este mismo token primero,
       * simplemente no mostramos
       * un mensaje antiguo.
       */
      return json({
        ok: true,
      })
    }

    const previousTelegramId =
      currentLink
        ?.telegram_user_id !=
      null
        ? Number(
            currentLink
              .telegram_user_id
          )
        : null

    const changingTelegram =
      previousTelegramId !==
        null &&
      previousTelegramId !==
        telegramUserId

    /*
     * Si se cambia a otra cuenta
     * de Telegram, retiramos la
     * cuenta anterior del canal.
     */
    if (
      changingTelegram &&
      previousTelegramId !==
        null
    ) {
      await removeOldTelegramAccount(
        previousTelegramId
      )
    }

    /*
     * Crear invitación personal.
     *
     * - máximo 1 usuario
     * - máximo 10 minutos
     * - nunca después del
     *   vencimiento de la membresía
     */
    const channelId =
      requiredEnv(
        "TELEGRAM_CHANNEL_ID"
      )

    const vipExpiration =
      Math.floor(
        new Date(
          membership.expires_at
        ).getTime() /
          1000
      )

    const temporaryExpiration =
      Math.floor(
        Date.now() /
          1000
      ) +
      10 * 60

    const inviteExpiresAt =
      Math.min(
        vipExpiration,
        temporaryExpiration
      )

    const invite =
      await telegramApi<TelegramInviteLink>(
        "createChatInviteLink",
        {
          chat_id:
            channelId,

          name:
            `vip-${telegramUserId}`.slice(
              0,
              32
            ),

          expire_date:
            inviteExpiresAt,

          member_limit:
            1,
        }
      )

    /*
     * Guardar vinculación.
     */
    if (currentLink) {
      const {
        error: updateError,
      } =
        await supabaseAdmin
          .from(
            "telegram_links"
          )
          .update({
            telegram_user_id:
              telegramUserId,

            telegram_username:
              telegramUsername,

            membership_id:
              String(
                membership.id
              ),

            linked_at:
              nowIso,

            last_changed_at:
              changingTelegram
                ? nowIso
                : currentLink
                    .last_changed_at,

            change_count:
              changingTelegram
                ? currentLink
                    .change_count +
                  1
                : currentLink
                    .change_count,

            updated_at:
              nowIso,
          })
          .eq(
            "user_id",
            tokenRow.user_id
          )

      if (updateError) {
        await revokeInviteLink(
          invite.invite_link
        )

        throw updateError
      }
    } else {
      const {
        error: insertError,
      } =
        await supabaseAdmin
          .from(
            "telegram_links"
          )
          .insert({
            user_id:
              tokenRow.user_id,

            telegram_user_id:
              telegramUserId,

            telegram_username:
              telegramUsername,

            membership_id:
              String(
                membership.id
              ),

            linked_at:
              nowIso,

            last_changed_at:
              null,

            change_count:
              0,

            created_at:
              nowIso,

            updated_at:
              nowIso,
          })

      if (insertError) {
        await revokeInviteLink(
          invite.invite_link
        )

        throw insertError
      }
    }

    /*
     * Todo correcto.
     */
    await sendMessage(
      chatId,
      [
        changingTelegram
          ? "Cuenta de Telegram actualizada correctamente."
          : "Cuenta vinculada correctamente.",
        "",
        "Tu acceso privado a The Golden Circle está listo.",
        "",
        "El enlace es personal y vence en 10 minutos.",
      ].join("\n"),
      {
        text:
          "Entrar a The Golden Circle",

        url:
          invite.invite_link,
      }
    )

    return json({
      ok: true,
    })
  } catch (error) {
    console.error(
      "Telegram webhook error:",
      error
    )

    if (chatId !== null) {
      try {
        await sendMessage(
          chatId,
          [
            "No pudimos completar la vinculación.",
            "",
            "Vuelve a tu cuenta VIP y genera un nuevo enlace.",
          ].join("\n"),
          {
            text:
              "Ir a la página",

            url:
              "https://the-golden-circle-149p.vercel.app",
          }
        )
      } catch {}
    }

    return json({
      ok: true,
    })
  }
}