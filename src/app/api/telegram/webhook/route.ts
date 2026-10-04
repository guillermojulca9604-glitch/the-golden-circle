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

type TelegramSentMessage = {
  message_id: number
}

type TelegramInviteLink = {
  invite_link: string
  expire_date?: number
  member_limit?: number
  creates_join_request?: boolean
  is_revoked?: boolean
}

type TelegramChatMemberState = {
  status: string
  user: TelegramUser
  is_member?: boolean
}

type TelegramChatMemberUpdated = {
  chat: TelegramChat
  from: TelegramUser
  date: number
  old_chat_member: TelegramChatMemberState
  new_chat_member: TelegramChatMemberState
  invite_link?: TelegramInviteLink
}

type TelegramChatJoinRequest = {
  chat: TelegramChat
  from: TelegramUser
  user_chat_id: number
  date: number
  invite_link?: TelegramInviteLink
}

type TelegramUpdate = {
  update_id: number
  message?: TelegramMessage
  chat_member?: TelegramChatMemberUpdated
  chat_join_request?: TelegramChatJoinRequest
}

type TelegramApiResponse<T> = {
  ok: boolean
  result?: T
  description?: string
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

  active_invite_link:
    | string
    | null

  active_invite_expires_at:
    | string
    | null

  active_invite_message_id:
    | number
    | string
    | null
}

type ActiveInviteLink = {
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

  active_invite_link:
    | string
    | null

  active_invite_expires_at:
    | string
    | null
}

const TELEGRAM_API =
  "https://api.telegram.org"

const WEBSITE_URL =
  "https://the-golden-circle-149p.vercel.app"

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

        cache:
          "no-store",
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
): Promise<TelegramSentMessage> {
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

  return telegramApi<TelegramSentMessage>(
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

async function deleteInviteMessage(
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
      "No se pudo eliminar el mensaje de invitación anterior:",
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

async function removeTelegramAccount(
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

function isActiveMember(
  member:
    TelegramChatMemberState
) {
  if (
    member.status ===
      "creator" ||
    member.status ===
      "administrator" ||
    member.status ===
      "member"
  ) {
    return true
  }

  return (
    member.status ===
      "restricted" &&
    member.is_member === true
  )
}

function isRegularMember(
  member:
    TelegramChatMemberState
) {
  return (
    member.status ===
      "member" ||
    (
      member.status ===
        "restricted" &&
      member.is_member === true
    )
  )
}

async function clearActiveInvite(
  userId: string,
  inviteLink: string,
  nowIso: string
) {
  const {
    error,
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

        updated_at:
          nowIso,
      })
      .eq(
        "user_id",
        userId
      )
      .eq(
        "active_invite_link",
        inviteLink
      )

  if (error) {
    console.error(
      "No se pudo limpiar la invitación activa:",
      error
    )
  }
}

async function handleChatMemberUpdate(
  memberUpdate:
    TelegramChatMemberUpdated
) {
  const configuredChannelId =
    requiredEnv(
      "TELEGRAM_CHANNEL_ID"
    )

  if (
    String(
      memberUpdate.chat.id
    ) !==
    configuredChannelId
  ) {
    return
  }

  const wasMember =
    isActiveMember(
      memberUpdate
        .old_chat_member
    )

  const isMember =
    isActiveMember(
      memberUpdate
        .new_chat_member
    )

  /*
   * Solo procesamos una
   * nueva entrada al canal.
   */
  if (
    wasMember ||
    !isMember ||
    !isRegularMember(
      memberUpdate
        .new_chat_member
    )
  ) {
    return
  }

  const telegramUser =
    memberUpdate
      .new_chat_member
      .user

  if (telegramUser.is_bot) {
    return
  }

  const telegramUserId =
    telegramUser.id

  const telegramUsername =
    telegramUser.username
      ?.trim() ||
    null

  const now =
    new Date()

  const nowIso =
    now.toISOString()

  const usedInviteLink =
    memberUpdate
      .invite_link
      ?.invite_link ??
    null

  /*
   * Entrada sin uno de
   * nuestros pases.
   */
  if (!usedInviteLink) {
    await removeTelegramAccount(
      telegramUserId
    )

    return
  }

  /*
   * Buscar a qué VIP pertenece
   * exactamente la invitación.
   */
  const {
    data: inviteOwner,
    error:
      inviteOwnerError,
  } =
    await supabaseAdmin
      .from(
        "telegram_links"
      )
      .select(
        "user_id,telegram_user_id,telegram_username,membership_id,linked_at,active_invite_link,active_invite_expires_at"
      )
      .eq(
        "active_invite_link",
        usedInviteLink
      )
      .maybeSingle<ActiveInviteLink>()

  if (inviteOwnerError) {
    await removeTelegramAccount(
      telegramUserId
    )

    throw inviteOwnerError
  }

  /*
   * Invitación reemplazada,
   * revocada o inexistente.
   */
  if (
    !inviteOwner ||
    !inviteOwner
      .membership_id ||
    !inviteOwner
      .active_invite_link ||
    inviteOwner
      .active_invite_link !==
      usedInviteLink
  ) {
    await removeTelegramAccount(
      telegramUserId
    )

    await revokeInviteLink(
      usedInviteLink
    )

    return
  }

  /*
   * Comprobar vencimiento
   * temporal del pase.
   */
  const activeInviteExpiration =
    inviteOwner
      .active_invite_expires_at
      ? new Date(
          inviteOwner
            .active_invite_expires_at
        )
      : null

  if (
    !activeInviteExpiration ||
    Number.isNaN(
      activeInviteExpiration
        .getTime()
    ) ||
    activeInviteExpiration
      .getTime() <=
      now.getTime()
  ) {
    await removeTelegramAccount(
      telegramUserId
    )

    await revokeInviteLink(
      usedInviteLink
    )

    await clearActiveInvite(
      inviteOwner.user_id,
      usedInviteLink,
      nowIso
    )

    return
  }

  /*
   * Comprobar membresía VIP.
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
        inviteOwner
          .membership_id
      )
      .eq(
        "user_id",
        inviteOwner
          .user_id
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
    await removeTelegramAccount(
      telegramUserId
    )

    throw membershipError
  }

  if (!membership) {
    await removeTelegramAccount(
      telegramUserId
    )

    await revokeInviteLink(
      usedInviteLink
    )

    await clearActiveInvite(
      inviteOwner.user_id,
      usedInviteLink,
      nowIso
    )

    return
  }

  /*
   * Una vez vinculado,
   * solo ese mismo Telegram
   * puede utilizar el acceso
   * normal.
   */
  if (
    inviteOwner
      .telegram_user_id ==
      null ||
    Number(
      inviteOwner
        .telegram_user_id
    ) !== telegramUserId
  ) {
    await removeTelegramAccount(
      telegramUserId
    )

    await revokeInviteLink(
      usedInviteLink
    )

    await clearActiveInvite(
      inviteOwner.user_id,
      usedInviteLink,
      nowIso
    )

    return
  }

  /*
   * El Telegram tampoco puede
   * pertenecer a otro VIP.
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
      .neq(
        "user_id",
        inviteOwner.user_id
      )
      .maybeSingle()

  if (telegramUsedError) {
    await removeTelegramAccount(
      telegramUserId
    )

    throw telegramUsedError
  }

  if (
    telegramUsedByAnotherUser
  ) {
    await removeTelegramAccount(
      telegramUserId
    )

    await revokeInviteLink(
      usedInviteLink
    )

    await clearActiveInvite(
      inviteOwner.user_id,
      usedInviteLink,
      nowIso
    )

    return
  }

  /*
   * Todo correcto.
   */
  const {
    error:
      updateLinkError,
  } =
    await supabaseAdmin
      .from(
        "telegram_links"
      )
      .update({
        telegram_username:
          telegramUsername,

        membership_id:
          String(
            membership.id
          ),

        linked_at:
          nowIso,

        active_invite_link:
          null,

        active_invite_expires_at:
          null,

        updated_at:
          nowIso,
      })
      .eq(
        "user_id",
        inviteOwner.user_id
      )
      .eq(
        "telegram_user_id",
        telegramUserId
      )
      .eq(
        "active_invite_link",
        usedInviteLink
      )

  if (updateLinkError) {
    await removeTelegramAccount(
      telegramUserId
    )

    await revokeInviteLink(
      usedInviteLink
    )

    throw updateLinkError
  }

  /*
   * El pase ya cumplió
   * su función.
   */
  await revokeInviteLink(
    usedInviteLink
  )
}

async function handleLegacyJoinRequest(
  joinRequest:
    TelegramChatJoinRequest
) {
  const configuredChannelId =
    requiredEnv(
      "TELEGRAM_CHANNEL_ID"
    )

  if (
    String(
      joinRequest.chat.id
    ) !==
    configuredChannelId
  ) {
    return
  }

  /*
   * Solo para invitaciones
   * antiguas con
   * "Solicitar unirse".
   */
  await telegramApi<boolean>(
    "declineChatJoinRequest",
    {
      chat_id:
        joinRequest.chat.id,

      user_id:
        joinRequest.from.id,
    }
  )

  if (
    joinRequest
      .invite_link
      ?.invite_link
  ) {
    await revokeInviteLink(
      joinRequest
        .invite_link
        .invite_link
    )
  }
}

export async function POST(
  request: Request
) {
  let chatId:
    | number
    | null = null

  try {
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

    /*
     * Entrada directa al canal.
     */
    if (
      update.chat_member
    ) {
      await handleChatMemberUpdate(
        update.chat_member
      )

      return json({
        ok: true,
      })
    }

    /*
     * Compatibilidad con
     * invitaciones antiguas.
     */
    if (
      update.chat_join_request
    ) {
      await handleLegacyJoinRequest(
        update.chat_join_request
      )

      return json({
        ok: true,
      })
    }

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

    await deleteIncomingMessage(
      chatId,
      message.message_id
    )

    const token =
      getStartToken(
        text
      )

    /*
     * Entrada directa al bot,
     * sin pase de la web.
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
            WEBSITE_URL,
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
            WEBSITE_URL,
        }
      )

      return json({
        ok: true,
      })
    }

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
            WEBSITE_URL,
        }
      )

      return json({
        ok: true,
      })
    }

    /*
     * Comprobar membresía.
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
            WEBSITE_URL,
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
     * Un Telegram no puede
     * pertenecer a dos VIP.
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
            WEBSITE_URL,
        }
      )

      return json({
        ok: true,
      })
    }

    /*
     * Vinculación actual.
     */
    const {
      data: currentLink,
      error:
        currentLinkError,
    } =
      await supabaseAdmin
        .from(
          "telegram_links"
        )
        .select(
          "user_id,telegram_user_id,telegram_username,membership_id,linked_at,last_changed_at,change_count,active_invite_link,active_invite_expires_at,active_invite_message_id"
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
     * Si ya tiene Telegram
     * vinculado, el acceso normal
     * solamente funciona desde
     * esa misma cuenta.
     */
    if (
      currentLink
        ?.telegram_user_id !=
        null &&
      Number(
        currentLink
          .telegram_user_id
      ) !== telegramUserId
    ) {
      await sendMessage(
        chatId,
        [
          "Este VIP ya está vinculado a otra cuenta de Telegram.",
          "",
          "Para utilizar otra cuenta de Telegram, debes realizar el cambio desde tu cuenta VIP.",
        ].join("\n"),
        {
          text:
            "Ir a la página",

          url:
            WEBSITE_URL,
        }
      )

      return json({
        ok: true,
      })
    }

    /*
     * Consumir token.
     */
    const {
      data:
        consumedToken,
      error:
        consumeError,
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
      return json({
        ok: true,
      })
    }

    /*
     * ==================================
     * ELIMINAR ACCESO ANTERIOR
     * ==================================
     *
     * 1. Lo quitamos de Supabase.
     * 2. Revocamos el link.
     * 3. Eliminamos el mensaje viejo.
     */
    if (
      currentLink &&
      (
        currentLink
          .active_invite_link ||
        currentLink
          .active_invite_message_id !=
          null
      )
    ) {
      const previousInviteLink =
        currentLink
          .active_invite_link

      const previousMessageId =
        currentLink
          .active_invite_message_id !=
        null
          ? Number(
              currentLink
                .active_invite_message_id
            )
          : null

      /*
       * El mensaje anterior pertenece
       * al chat del Telegram que estaba
       * vinculado.
       *
       * En un chat privado:
       * chat_id = telegram_user_id.
       */
      const previousChatId =
        currentLink
          .telegram_user_id !=
        null
          ? Number(
              currentLink
                .telegram_user_id
            )
          : chatId

      const {
        error:
          clearPreviousInviteError,
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
              nowIso,
          })
          .eq(
            "user_id",
            tokenRow.user_id
          )

      if (
        clearPreviousInviteError
      ) {
        throw clearPreviousInviteError
      }

      /*
       * Revocación del enlace y
       * eliminación visual del
       * mensaje pueden ejecutarse
       * al mismo tiempo.
       */
      await Promise.all([
        previousInviteLink
          ? revokeInviteLink(
              previousInviteLink
            )
          : Promise.resolve(),

        previousMessageId !==
          null &&
        previousChatId !==
          null
          ? deleteInviteMessage(
              previousChatId,
              previousMessageId
            )
          : Promise.resolve(),
      ])
    }

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

    /*
     * Invitación directa:
     *
     * - sin "Solicitar unirse"
     * - máximo 1 uso
     * - máximo 10 minutos
     */
    const invite =
      await telegramApi<TelegramInviteLink>(
        "createChatInviteLink",
        {
          chat_id:
            channelId,

          name:
            `vip-${tokenRow.user_id}`.slice(
              0,
              32
            ),

          expire_date:
            inviteExpiresAt,

          member_limit:
            1,
        }
      )

    const activeInviteExpiresAt =
      new Date(
        inviteExpiresAt *
          1000
      ).toISOString()

    /*
     * Guardar nueva invitación.
     */
    if (currentLink) {
      const {
        error:
          updateError,
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
              currentLink
                .last_changed_at,

            change_count:
              currentLink
                .change_count,

            active_invite_link:
              invite.invite_link,

            active_invite_expires_at:
              activeInviteExpiresAt,

            active_invite_message_id:
              null,

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
        error:
          insertError,
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

            active_invite_link:
              invite.invite_link,

            active_invite_expires_at:
              activeInviteExpiresAt,

            active_invite_message_id:
              null,

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
     * Enviar el nuevo mensaje
     * y recuperar su message_id.
     */
    const inviteMessage =
      await sendMessage(
        chatId,
        [
          "Cuenta vinculada correctamente.",
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

    /*
     * Guardar qué mensaje debe
     * eliminarse cuando se genere
     * el próximo acceso.
     */
    const {
      error:
        messageIdError,
    } =
      await supabaseAdmin
        .from(
          "telegram_links"
        )
        .update({
          active_invite_message_id:
            inviteMessage.message_id,

          updated_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "user_id",
          tokenRow.user_id
        )
        .eq(
          "active_invite_link",
          invite.invite_link
        )

    if (messageIdError) {
      /*
       * Si no pudimos guardar
       * el message_id, no dejamos
       * una invitación sin control.
       */
      await Promise.all([
        revokeInviteLink(
          invite.invite_link
        ),

        deleteInviteMessage(
          chatId,
          inviteMessage.message_id
        ),
      ])

      await clearActiveInvite(
        tokenRow.user_id,
        invite.invite_link,
        nowIso
      )

      throw messageIdError
    }

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
              WEBSITE_URL,
          }
        )
      } catch {}
    }

    return json({
      ok: true,
    })
  }
}