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

type TelegramServiceStateRow = {
  maintenance: boolean
}

const TELEGRAM_API =
  "https://api.telegram.org"

const TELEGRAM_LINK_PAGE_SIZE =
  500

const MEMBERSHIP_BATCH_SIZE =
  200

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
  body: Record<
    string,
    unknown
  >
): Promise<T> {
  const botToken =
    requiredEnv(
      "TELEGRAM_BOT_TOKEN"
    )

  const response =
    await fetch(
      `${TELEGRAM_API}/bot${botToken}/${method}`,
      {
        method:
          "POST",

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
 * BAN:
 *
 * Expulsa al usuario y lo
 * mantiene bloqueado.
 *
 * Durante mantenimiento usamos
 * solamente esta operación.
 */
async function banTelegramAccount(
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
}

/*
 * Funcionamiento normal al
 * terminar un VIP:
 *
 * BAN:
 * lo saca del canal.
 *
 * UNBAN:
 * elimina el bloqueo después
 * de expulsarlo para que pueda
 * utilizar Telegram nuevamente
 * con un futuro VIP.
 */
async function removeTelegramAccount(
  telegramUserId: number
) {
  const channelId =
    requiredEnv(
      "TELEGRAM_CHANNEL_ID"
    )

  await banTelegramAccount(
    telegramUserId
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

/*
 * Consultamos el estado global
 * de Telegram.
 *
 * Si no podemos conocer el estado,
 * no continuamos con la limpieza.
 *
 * Así evitamos hacer un UNBAN
 * accidental mientras el servicio
 * podría estar en mantenimiento.
 */
async function getTelegramMaintenanceState() {
  const {
    data,
    error,
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
      .maybeSingle<TelegramServiceStateRow>()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error(
      "No existe el estado del servicio de Telegram."
    )
  }

  return (
    data.maintenance ===
    true
  )
}

/*
 * Leer TODAS las vinculaciones
 * Telegram por páginas.
 *
 * Antes existía .limit(100),
 * por lo que un usuario ubicado
 * después de esos primeros 100
 * podía quedar sin procesar.
 */
async function getTelegramLinks() {
  const links:
    TelegramLinkRow[] = []

  let from =
    0

  while (true) {
    const to =
      from +
      TELEGRAM_LINK_PAGE_SIZE -
      1

    const {
      data,
      error,
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
        .order(
          "user_id",
          {
            ascending:
              true,
          }
        )
        .range(
          from,
          to
        )
        .returns<
          TelegramLinkRow[]
        >()

    if (error) {
      throw error
    }

    const page =
      data ?? []

    links.push(
      ...page
    )

    if (
      page.length <
      TELEGRAM_LINK_PAGE_SIZE
    ) {
      break
    }

    from +=
      TELEGRAM_LINK_PAGE_SIZE
  }

  return links
}

function splitIntoBatches<T>(
  items: T[],
  size: number
) {
  const batches:
    T[][] = []

  for (
    let index = 0;
    index <
    items.length;
    index += size
  ) {
    batches.push(
      items.slice(
        index,
        index +
          size
      )
    )
  }

  return batches
}

/*
 * Precargamos las membresías
 * vinculadas en grupos.
 *
 * Así evitamos hacer una consulta
 * individual para cada usuario
 * activo del sistema.
 */
async function getMembershipMap(
  links:
    TelegramLinkRow[]
) {
  const membershipIds =
    Array.from(
      new Set(
        links
          .map(
            (
              link
            ) =>
              link.membership_id
          )
          .filter(
            (
              value
            ): value is string =>
              Boolean(
                value
              )
          )
      )
    )

  const membershipMap =
    new Map<
      string,
      MembershipRow
    >()

  const batches =
    splitIntoBatches(
      membershipIds,
      MEMBERSHIP_BATCH_SIZE
    )

  for (
    const batch
    of batches
  ) {
    if (
      batch.length ===
      0
    ) {
      continue
    }

    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from(
          "memberships"
        )
        .select(
          "id,user_id,status,expires_at"
        )
        .in(
          "id",
          batch
        )
        .returns<
          MembershipRow[]
        >()

    if (error) {
      throw error
    }

    for (
      const membership
      of data ?? []
    ) {
      membershipMap.set(
        membership.id,
        membership
      )
    }
  }

  return membershipMap
}

function isMembershipActive(
  membership:
    | MembershipRow
    | null
    | undefined,
  now: Date
) {
  if (!membership) {
    return false
  }

  if (
    membership.status !==
    "active"
  ) {
    return false
  }

  const expiresAt =
    new Date(
      membership.expires_at
    )

  if (
    Number.isNaN(
      expiresAt.getTime()
    )
  ) {
    return false
  }

  return (
    expiresAt.getTime() >
    now.getTime()
  )
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
        status:
          401,
      }
    )
  }

  const now =
    new Date()

  const nowIso =
    now.toISOString()

  try {
    /*
     * Primero conocemos el estado
     * global de Telegram.
     *
     * maintenance = false:
     * comportamiento normal.
     *
     * maintenance = true:
     * nunca hacemos UNBAN.
     */
    const maintenance =
      await getTelegramMaintenanceState()

    /*
     * Obtenemos todas las cuentas
     * Telegram vinculadas a un VIP.
     *
     * Ya no existe el límite fijo
     * de 100 registros.
     */
    const links =
      await getTelegramLinks()

    if (
      links.length ===
      0
    ) {
      return NextResponse.json({
        ok: true,
        maintenance,
        checked:
          0,
        expired:
          0,
        deferred:
          0,
        errors:
          0,
      })
    }

    /*
     * Precargamos membresías para
     * que los VIP todavía activos
     * no necesiten una consulta
     * individual cada minuto.
     */
    const membershipMap =
      await getMembershipMap(
        links
      )

    let checked =
      0

    let expired =
      0

    /*
     * Cantidad de vencimientos
     * procesados durante
     * mantenimiento.
     *
     * Permanecen con su Telegram ID
     * guardado hasta que el Admin
     * quite el mantenimiento.
     */
    let deferred =
      0

    const failures:
      Array<{
        user_id:
          string
        error:
          string
      }> = []

    for (
      const link
      of links
    ) {
      checked +=
        1

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
         * Comprobación rápida usando
         * las membresías precargadas.
         */
        const cachedMembership =
          membershipMap.get(
            link.membership_id
          )

        const cachedMembershipMatchesUser =
          Boolean(
            cachedMembership &&
              cachedMembership.user_id ===
                link.user_id
          )

        if (
          cachedMembershipMatchesUser &&
          isMembershipActive(
            cachedMembership,
            now
          )
        ) {
          continue
        }

        /*
         * Si parece vencida, inactiva
         * o inexistente, hacemos una
         * segunda comprobación exacta.
         *
         * Así evitamos expulsar a alguien
         * si la membresía cambió mientras
         * el cron estaba trabajando.
         */
        const {
          data:
            membership,
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

        if (
          isMembershipActive(
            membership,
            now
          )
        ) {
          continue
        }

        /*
         * Antes de tocar Telegram,
         * comprobamos que la fila siga
         * correspondiendo exactamente
         * a la misma membresía y al
         * mismo Telegram.
         */
        const {
          data:
            currentLink,
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

        if (
          !currentLink
        ) {
          /*
           * La vinculación cambió
           * mientras procesábamos.
           *
           * No tocamos nada.
           */
          continue
        }

        /*
         * =================================
         * MODO MANTENIMIENTO
         * =================================
         *
         * El usuario ya debería estar
         * fuera porque el mantenimiento
         * expulsó a todos.
         *
         * Aun así hacemos BAN para
         * garantizar que un VIP que vence
         * durante mantenimiento quede
         * fuera y bloqueado.
         *
         * IMPORTANTE:
         *
         * NO hacemos UNBAN.
         *
         * NO borramos telegram_user_id.
         *
         * Ese ID será utilizado cuando
         * el administrador pulse
         * "Quitar mantenimiento".
         */
        if (
          maintenance
        ) {
          await banTelegramAccount(
            telegramUserId
          )

          /*
           * Si todavía existe una
           * invitación, la revocamos.
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
           * Dejamos telegram_user_id
           * almacenado para que el proceso
           * de reapertura pueda hacer
           * UNBAN correctamente.
           *
           * Quitamos membership_id para
           * marcar que este VIP ya terminó.
           *
           * Así el cron tampoco intenta
           * banearlo nuevamente cada minuto.
           */
          const {
            data:
              deferredRow,
            error:
              deferredError,
          } =
            await supabaseAdmin
              .from(
                "telegram_links"
              )
              .update({
                membership_id:
                  null,

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

          if (
            deferredError
          ) {
            throw deferredError
          }

          if (
            !deferredRow
          ) {
            throw new Error(
              "La vinculación cambió antes de poder marcar el vencimiento durante mantenimiento."
            )
          }

          expired +=
            1

          deferred +=
            1

          continue
        }

        /*
         * =================================
         * FUNCIONAMIENTO NORMAL
         * =================================
         *
         * BAN:
         * expulsa al usuario.
         *
         * UNBAN:
         * después de expulsarlo quitamos
         * el bloqueo para que un futuro
         * VIP pueda utilizar Telegram.
         */
        await removeTelegramAccount(
          telegramUserId
        )

        /*
         * Si todavía existe el enlace
         * "Entrar a The Golden Circle",
         * queda inutilizado.
         *
         * El mensaje del bot puede
         * permanecer visible.
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
         * Reinicio COMPLETO de la
         * vinculación Telegram.
         *
         * user_id NO se borra porque
         * sigue siendo la misma cuenta
         * de la página.
         */
        const {
          data:
            resetRow,
          error:
            resetError,
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
             * Exigimos que siga siendo
             * exactamente la misma
             * vinculación.
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

        if (
          resetError
        ) {
          throw resetError
        }

        if (
          !resetRow
        ) {
          throw new Error(
            "La vinculación cambió antes de poder reiniciarse."
          )
        }

        expired +=
          1
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
            error instanceof
            Error
              ? error.message
              : "Error desconocido",
        })
      }
    }

    return NextResponse.json({
      ok:
        failures.length ===
        0,

      maintenance,

      checked,

      expired,

      deferred,

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
        status:
          500,
      }
    )
  }
}