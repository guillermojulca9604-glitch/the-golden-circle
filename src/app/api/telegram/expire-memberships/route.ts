import { NextResponse } from "next/server"

import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type TelegramApiResponse<T> = {
  ok: boolean
  result?: T
  description?: string
}

type TelegramLinkRow = {
  user_id: string

  telegram_user_id:
    | number
    | string
    | null

  membership_id:
    | string
    | null

  active_invite_link:
    | string
    | null
}

type MembershipRow = {
  id: string
  user_id: string
  status: string
  expires_at: string
}

const TELEGRAM_API =
  "https://api.telegram.org"

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
  body: Record<string, unknown>
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

/*
 * Expulsar al usuario del canal.
 *
 * BAN:
 * lo saca del canal.
 *
 * UNBAN:
 * deja de estar bloqueado para que,
 * si compra otro VIP en el futuro,
 * pueda volver a ingresar.
 */
async function removeTelegramAccount(
  telegramUserId: number
) {
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
}

/*
 * Inutilizar el enlace del botón
 * "Entrar a The Golden Circle".
 *
 * NO borra el mensaje del bot.
 */
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
    /*
     * Si ya expiró o ya fue
     * revocado, no pasa nada.
     */
    console.error(
      "No se pudo revocar la invitación antigua:",
      error
    )
  }
}

export async function POST(
  request: Request
) {
  const expectedSecret =
    process.env
      .TELEGRAM_EXPIRY_CRON_SECRET
      ?.trim()

  const receivedSecret =
    request.headers.get(
      "x-telegram-expiry-secret"
    )

  /*
   * Nadie puede ejecutar esta
   * limpieza sin conocer el secreto.
   */
  if (
    !expectedSecret ||
    !receivedSecret ||
    receivedSecret !==
      expectedSecret
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Unauthorized",
      },
      {
        status: 401,
      }
    )
  }

  const now =
    new Date()

  const nowIso =
    now.toISOString()

  try {
    /*
     * Solo buscamos cuentas que
     * actualmente tienen Telegram
     * vinculado a un VIP.
     */
    const {
      data: links,
      error: linksError,
    } =
      await supabaseAdmin
        .from(
          "telegram_links"
        )
        .select(
          "user_id,telegram_user_id,membership_id,active_invite_link"
        )
        .not(
          "telegram_user_id",
          "is",
          null
        )
        .not(
          "membership_id",
          "is",
          null
        )
        .limit(100)
        .returns<
          TelegramLinkRow[]
        >()

    if (linksError) {
      throw linksError
    }

    if (
      !links ||
      links.length === 0
    ) {
      return NextResponse.json({
        ok: true,
        checked: 0,
        expired: 0,
        errors: 0,
      })
    }

    let checked =
      0

    let expired =
      0

    const failures:
      Array<{
        user_id: string
        error: string
      }> = []

    for (
      const link
      of links
    ) {
      checked += 1

      try {
        if (
          !link.membership_id ||
          link.telegram_user_id ==
            null
        ) {
          continue
        }

        const telegramUserId =
          Number(
            link.telegram_user_id
          )

        if (
          !Number.isFinite(
            telegramUserId
          )
        ) {
          throw new Error(
            "Telegram ID inválido."
          )
        }

        /*
         * Revisamos LA membresía
         * exacta que originó esta
         * vinculación Telegram.
         *
         * Esto es importante:
         *
         * VIP #1 → Telegram A
         *
         * cuando VIP #1 termina,
         * esa vinculación también
         * termina.
         */
        const {
          data: membership,
          error:
            membershipError,
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
              link.membership_id
            )
            .eq(
              "user_id",
              link.user_id
            )
            .maybeSingle<
              MembershipRow
            >()

        if (
          membershipError
        ) {
          throw membershipError
        }

        /*
         * Sigue siendo válido si:
         *
         * existe
         * status = active
         * expires_at > ahora
         */
        const membershipExpiresAt =
          membership
            ? new Date(
                membership
                  .expires_at
              )
            : null

        const stillActive =
          Boolean(
            membership &&
              membership.status ===
                "active" &&
              membershipExpiresAt &&
              !Number.isNaN(
                membershipExpiresAt
                  .getTime()
              ) &&
              membershipExpiresAt
                .getTime() >
                now.getTime()
          )

        if (stillActive) {
          continue
        }

        /*
         * Antes de expulsar,
         * comprobamos que la fila
         * siga correspondiendo a
         * ESTA misma membresía y
         * ESTE mismo Telegram.
         *
         * Evita actuar sobre una
         * vinculación que hubiera
         * cambiado mientras se
         * ejecutaba el proceso.
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
              "user_id"
            )
            .eq(
              "user_id",
              link.user_id
            )
            .eq(
              "membership_id",
              link.membership_id
            )
            .eq(
              "telegram_user_id",
              telegramUserId
            )
            .maybeSingle()

        if (
          currentLinkError
        ) {
          throw currentLinkError
        }

        if (!currentLink) {
          /*
           * La vinculación cambió
           * mientras procesábamos.
           *
           * No tocamos nada.
           */
          continue
        }

        /*
         * 1.
         * Expulsarlo del canal.
         *
         * Este es el mismo efecto
         * que viste al probar con B.
         */
        await removeTelegramAccount(
          telegramUserId
        )

        /*
         * 2.
         * Si todavía existe el enlace
         * "Entrar a The Golden Circle",
         * queda inutilizado.
         *
         * El mensaje se queda visible.
         */
        if (
          link.active_invite_link
        ) {
          await revokeInviteLink(
            link
              .active_invite_link
          )
        }

        /*
         * 3.
         * Reinicio COMPLETO de la
         * vinculación Telegram.
         *
         * user_id NO se borra porque
         * sigue siendo la misma cuenta
         * de la página.
         */
        const {
          data: resetRow,
          error: resetError,
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
                nowIso,
            })
            /*
             * Nuevamente exigimos que
             * siga siendo exactamente
             * la misma vinculación.
             */
            .eq(
              "user_id",
              link.user_id
            )
            .eq(
              "membership_id",
              link.membership_id
            )
            .eq(
              "telegram_user_id",
              telegramUserId
            )
            .select(
              "user_id"
            )
            .maybeSingle()

        if (resetError) {
          throw resetError
        }

        if (!resetRow) {
          throw new Error(
            "La vinculación cambió antes de poder reiniciarse."
          )
        }

        expired += 1
      } catch (error) {
        console.error(
          "Error procesando VIP vencido:",
          link.user_id,
          error
        )

        failures.push({
          user_id:
            link.user_id,

          error:
            error instanceof Error
              ? error.message
              : "Error desconocido",
        })
      }
    }

    return NextResponse.json({
      ok:
        failures.length === 0,

      checked,

      expired,

      errors:
        failures.length,
    })
  } catch (error) {
    console.error(
      "Telegram expiry error:",
      error
    )

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se pudo procesar el vencimiento de Telegram.",
      },
      {
        status: 500,
      }
    )
  }
}