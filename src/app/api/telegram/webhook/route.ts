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
      "No se pudo eliminar el mensaje de invitación:",
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

  /*
   * Fuerza la salida.
   */
  await telegramApi(
    "banChatMember",
    {
      chat_id:
        channelId,

      user_id:
        telegramUserId,
    }
  )

  /*
   * Quita el bloqueo.
   *
   * NO lo vuelve a ingresar.
   */
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

/*
 * Si el proceso de START BOT falla
 * por culpa del sistema después de
 * haber intentado vincular la cuenta,
 * liberamos la vinculación.
 *
 * Así el usuario puede intentarlo
 * nuevamente desde su VIP.
 *
 * Esto NO se usa cuando el propio
 * usuario pierde/compartió su pase.
 */
async function rollbackFailedBinding(
  userId: string,
  membershipId: string,
  telegramUserId: number
) {
  const {
    error,
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

        active_invite_link:
          null,

        active_invite_expires_at:
          null,

        active_invite_message_id:
          null,

        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "user_id",
        userId
      )
      .eq(
        "membership_id",
        membershipId
      )
      .eq(
        "telegram_user_id",
        telegramUserId
      )

  if (error) {
    console.error(
      "No se pudo revertir la vinculación fallida:",
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

  /*
   * ==================================
   * SALIDA VOLUNTARIA
   * ==================================
   *
   * Ya había consumido su pase.
   *
   * Sale por decisión propia:
   *
   * BAN → UNBAN
   *
   * No limpiamos su vinculación.
   * No recupera acceso.
   */
  const voluntaryExit =
    wasMember &&
    !isMember &&
    memberUpdate.from.id ===
      telegramUserId &&
    memberUpdate.from.is_bot !==
      true

  if (voluntaryExit) {
    const {
      data: linkedVip,
      error: linkedVipError,
    } =
      await supabaseAdmin
        .from(
          "telegram_links"
        )
        .select(
          "user_id,membership_id,linked_at"
        )
        .eq(
          "telegram_user_id",
          telegramUserId
        )
        .maybeSingle<{
          user_id: string
          membership_id:
            | string
            | null
          linked_at:
            | string
            | null
        }>()

    if (linkedVipError) {
      throw linkedVipError
    }

    if (
      !linkedVip ||
      !linkedVip.membership_id ||
      !linkedVip.linked_at
    ) {
      return
    }

    /*
     * Solo aplicamos este cierre
     * mientras el VIP relacionado
     * siga activo.
     *
     * Si ya venció, dejamos que
     * expire-memberships realice
     * su limpieza normal.
     */
    const {
      data: activeMembership,
      error: activeMembershipError,
    } =
      await supabaseAdmin
        .from(
          "memberships"
        )
        .select(
          "id"
        )
        .eq(
          "id",
          linkedVip.membership_id
        )
        .eq(
          "user_id",
          linkedVip.user_id
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

    if (
      activeMembershipError
    ) {
      throw activeMembershipError
    }

    if (!activeMembership) {
      return
    }

    await removeTelegramAccount(
      telegramUserId
    )

    return
  }

  /*
   * Desde aquí:
   * únicamente nuevas entradas.
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

  const usedInviteLink =
    memberUpdate
      .invite_link
      ?.invite_link ??
    null

  /*
   * Entrada sin nuestro pase.
   */
  if (!usedInviteLink) {
    await removeTelegramAccount(
      telegramUserId
    )

    return
  }

  /*
   * Buscar propietario exacto
   * de la invitación.
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
   * Invitación inexistente,
   * reemplazada o ya consumida.
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
   * Comprobar fecha del pase.
   *
   * Debe coincidir con la
   * vigencia del VIP.
   */
  const inviteExpiration =
    inviteOwner
      .active_invite_expires_at
      ? new Date(
          inviteOwner
            .active_invite_expires_at
        )
      : null

  if (
    !inviteExpiration ||
    Number.isNaN(
      inviteExpiration
        .getTime()
    ) ||
    inviteExpiration
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
   * Verificar membresía real.
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
   * ==================================
   * B UTILIZA EL PASE DE A
   * ==================================
   *
   * El Telegram que intenta entrar
   * NO es el Telegram vinculado.
   *
   * Consecuencia:
   *
   * B:
   * → expulsado.
   *
   * A:
   * → pierde esa invitación.
   * → NO recibe otra.
   *
   * La web de A ya estaba bloqueada
   * desde START BOT.
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
   * pertenecer simultáneamente
   * a otro usuario web.
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
   * ==================================
   * A ENTRA CORRECTAMENTE
   * ==================================
   *
   * La cuenta vinculada usó
   * correctamente su invitación.
   *
   * Se consume definitivamente.
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
          inviteOwner.linked_at ??
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
   * Pase utilizado.
   * No queda circulando.
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
    /*
     * ==================================
     * WEBHOOK SECRET
     * ==================================
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

    /*
     * ==================================
     * MANTENIMIENTO
     * ==================================
     *
     * Conservamos la barrera
     * que ya funciona.
     */
    const {
      data:
        telegramServiceState,
      error:
        telegramServiceStateError,
    } =
      await supabaseAdmin
        .from(
          "telegram_service_state"
        )
        .select(
          "maintenance"
        )
        .eq(
          "id",
          1
        )
        .maybeSingle()

    if (
      telegramServiceStateError ||
      !telegramServiceState
    ) {
      console.error(
        "No se pudo comprobar el estado de mantenimiento de Telegram:",
        telegramServiceStateError
      )

      /*
       * Respondemos 200 para evitar
       * que Telegram reintente.
       */
      return json({
        ok: true,
        ignored: true,
      })
    }

    if (
      telegramServiceState
        .maintenance === true
    ) {
      return json({
        ok: true,
        maintenance: true,
        ignored: true,
      })
    }

    const update =
      (await request.json()) as
        TelegramUpdate

    /*
     * Entrada/salida del canal.
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
     * Compatibilidad antigua.
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
     * Solo privados y personas.
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
     * Bot abierto directamente,
     * sin la web VIP.
     */
    if (!token) {
      await sendMessage(
        chatId,
        [
          "Acceso exclusivo para miembros de The Golden Circle.",
          "",
          "Ingresa a tu cuenta VIP para vincular Telegram.",
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
     * ==================================
     * TOKEN WEB → START BOT
     * ==================================
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

    /*
     * START BOT solamente puede
     * utilizarse una vez.
     */
    if (tokenRow.used_at) {
      return json({
        ok: true,
      })
    }

    const tokenExpiresAt =
      new Date(
        tokenRow.expires_at
      )

    if (
      Number.isNaN(
        tokenExpiresAt
          .getTime()
      ) ||
      tokenExpiresAt
        .getTime() <=
        now.getTime()
    ) {
      await sendMessage(
        chatId,
        [
          "Este enlace ha vencido.",
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

    /*
     * Comprobar VIP exacto.
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
          "No se puede vincular Telegram.",
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
     * Telegram no puede estar
     * vinculado a otra cuenta web.
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
     * Vinculación actual
     * del usuario web.
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

    const sameVipAlreadyLinked =
      Boolean(
        currentLink &&
        currentLink
          .membership_id !=
          null &&
        String(
          currentLink
            .membership_id
        ) ===
          String(
            tokenRow.membership_id
          ) &&
        (
          currentLink
            .telegram_user_id !=
            null ||
          currentLink
            .linked_at !=
            null
        )
      )

    /*
     * Seguridad adicional:
     *
     * aunque alguien consiguiera
     * un segundo token por carrera,
     * después del primer START BOT
     * no generamos otra invitación.
     */
    if (
      sameVipAlreadyLinked
    ) {
      await sendMessage(
        chatId,
        [
          "Este VIP ya tiene una cuenta de Telegram vinculada.",
          "",
          "No se puede generar otro acceso durante esta membresía.",
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
     * Consumir START BOT.
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
     * Si quedó una invitación vieja
     * perteneciente a una membresía
     * anterior, la eliminamos antes
     * de vincular el VIP nuevo.
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

      const previousChatId =
        currentLink
          .telegram_user_id !=
        null
          ? Number(
              currentLink
                .telegram_user_id
            )
          : null

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

      await Promise.all([
        previousInviteLink
          ? revokeInviteLink(
              previousInviteLink
            )
          : Promise.resolve(),

        previousMessageId !==
          null &&
        previousChatId !==
          null &&
        Number.isFinite(
          previousMessageId
        ) &&
        Number.isFinite(
          previousChatId
        )
          ? deleteInviteMessage(
              previousChatId,
              previousMessageId
            )
          : Promise.resolve(),
      ])
    }

    /*
     * ==================================
     * BOT → CANAL
     * ==================================
     *
     * NO 10 minutos.
     *
     * Vence exactamente cuando
     * termina el VIP.
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

    if (
      !Number.isFinite(
        vipExpiration
      ) ||
      vipExpiration <=
        Math.floor(
          Date.now() /
            1000
        )
    ) {
      throw new Error(
        "La membresía venció antes de crear la invitación."
      )
    }

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
            vipExpiration,

          /*
           * Una sola persona.
           *
           * Si la usa B antes que A,
           * el pase se pierde.
           */
          member_limit:
            1,
        }
      )

    const activeInviteExpiresAt =
      new Date(
        vipExpiration *
          1000
      ).toISOString()

    /*
     * ==================================
     * START BOT = VINCULACIÓN
     * ==================================
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
     * Entregar el único pase
     * BOT → CANAL.
     */
    let inviteMessage:
      TelegramSentMessage

    try {
      inviteMessage =
        await sendMessage(
          chatId,
          [
            "Cuenta vinculada correctamente.",
            "",
            "Tu acceso privado a The Golden Circle está listo.",
            "",
            "El enlace es personal, puede usarse una sola vez y estará disponible hasta que finalice tu membresía VIP.",
          ].join("\n"),
          {
            text:
              "Entrar a The Golden Circle",

            url:
              invite.invite_link,
          }
        )
    } catch (error) {
      /*
       * Falla del sistema:
       * no castigamos al usuario.
       */
      await revokeInviteLink(
        invite.invite_link
      )

      await rollbackFailedBinding(
        tokenRow.user_id,
        String(
          membership.id
        ),
        telegramUserId
      )

      throw error
    }

    /*
     * Guardar message_id.
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
          "membership_id",
          String(
            membership.id
          )
        )
        .eq(
          "telegram_user_id",
          telegramUserId
        )
        .eq(
          "active_invite_link",
          invite.invite_link
        )

    if (messageIdError) {
      /*
       * También es un fallo interno.
       * Permitimos que vuelva a
       * comenzar el proceso.
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

      await rollbackFailedBinding(
        tokenRow.user_id,
        String(
          membership.id
        ),
        telegramUserId
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
            "Vuelve a tu cuenta VIP e inténtalo nuevamente.",
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

    /*
     * Siempre 200 a Telegram
     * para evitar reintentos
     * descontrolados.
     */
    return json({
      ok: true,
    })
  }
}