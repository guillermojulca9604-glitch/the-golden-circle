"use client"

import {
  useState,
} from "react"

export type TelegramServiceState = {
  id: number
  maintenance: boolean
  message: string
  maintenance_started_at:
    | string
    | null
  updated_at: string
}

type MaintenanceResponse = {
  ok?: boolean
  maintenance?: boolean
  cleanupComplete?: boolean
  state?: TelegramServiceState
  error?: string
}

type Feedback = {
  type:
    | "warning"
    | "error"
  text: string
}

type TelegramMaintenanceCardProps = {
  initialState:
    TelegramServiceState
}

const DEFAULT_MESSAGE =
  "The Golden Circle se encuentra temporalmente en mantenimiento."

export default function TelegramMaintenanceCard({
  initialState,
}: TelegramMaintenanceCardProps) {
  const initialMessage =
    initialState.message ||
    DEFAULT_MESSAGE

  const [
    state,
    setState,
  ] =
    useState<TelegramServiceState>(
      initialState
    )

  const [
    message,
    setMessage,
  ] =
    useState(
      initialMessage
    )

  const [
    savedMessage,
    setSavedMessage,
  ] =
    useState(
      initialMessage
    )

  const [
    processing,
    setProcessing,
  ] =
    useState<
      | "enable"
      | "disable"
      | "update-message"
      | null
    >(null)

  const [
    confirming,
    setConfirming,
  ] =
    useState<
      "enable" |
      "disable" |
      null
    >(null)

  const [
    feedback,
    setFeedback,
  ] =
    useState<Feedback | null>(
      null
    )

  async function runAction(
    action:
      | "enable"
      | "disable"
  ) {
    if (
      processing
    ) {
      return
    }

    setProcessing(
      action
    )

    setFeedback(
      null
    )

    try {
      const response =
        await fetch(
          "/api/admin/telegram-maintenance",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                action,

                ...(action ===
                "enable"
                  ? {
                      message:
                        message.trim() ||
                        DEFAULT_MESSAGE,
                    }
                  : {}),
              }),
          }
        )

      const body =
        (await response.json()) as
          MaintenanceResponse

      if (
        body.state
      ) {
        const nextMessage =
          body.state.message ||
          DEFAULT_MESSAGE

        setState(
          body.state
        )

        setMessage(
          nextMessage
        )

        setSavedMessage(
          nextMessage
        )
      }

      if (!response.ok) {
        setFeedback({
          type: "error",
          text:
            body.error ||
            "No se pudo completar la operación.",
        })

        setConfirming(
          null
        )

        return
      }

      if (
        action ===
          "enable" &&
        body.cleanupComplete ===
          false
      ) {
        setFeedback({
          type:
            "warning",
          text:
            "El mantenimiento quedó activo, pero algunas tareas de Telegram necesitan revisión.",
        })

        setConfirming(
          null
        )

        return
      }

      setFeedback(
        null
      )

      setConfirming(
        null
      )
    } catch {
      setFeedback({
        type:
          "error",
        text:
          "No se pudo completar la operación.",
      })

      setConfirming(
        null
      )
    } finally {
      setProcessing(
        null
      )
    }
  }

  async function updateMessage() {
    if (
      processing ||
      !state.maintenance
    ) {
      return
    }

    const cleanMessage =
      message.trim()

    if (
      !cleanMessage ||
      cleanMessage ===
        savedMessage.trim()
    ) {
      return
    }

    setProcessing(
      "update-message"
    )

    setFeedback(
      null
    )

    try {
      const response =
        await fetch(
          "/api/admin/telegram-maintenance/message",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                message:
                  cleanMessage,
              }),
          }
        )

      const body =
        (await response.json()) as
          MaintenanceResponse

      if (
        body.state
      ) {
        const nextMessage =
          body.state.message ||
          DEFAULT_MESSAGE

        setState(
          body.state
        )

        setMessage(
          nextMessage
        )

        setSavedMessage(
          nextMessage
        )
      }

      if (!response.ok) {
        setFeedback({
          type:
            "error",
          text:
            body.error ||
            "No se pudo actualizar el mensaje.",
        })

        return
      }

      setFeedback(
        null
      )
    } catch {
      setFeedback({
        type:
          "error",
        text:
          "No se pudo actualizar el mensaje.",
      })
    } finally {
      setProcessing(
        null
      )
    }
  }

  const maintenance =
    state.maintenance

  const characterCount =
    message.length

  const enableDisabled =
    processing !==
      null ||
    maintenance

  const disableDisabled =
    processing !==
      null ||
    !maintenance

  const cleanMessage =
    message.trim()

  const messageChanged =
    cleanMessage !==
    savedMessage.trim()

  const updateMessageDisabled =
    processing !==
      null ||
    !maintenance ||
    !cleanMessage ||
    !messageChanged

  const updateMessageVisuallyDisabled =
    !maintenance ||
    !cleanMessage ||
    !messageChanged

  const textareaDisabled =
    processing !==
      null ||
    confirming !==
      null

  return (
    <section className="mt-6 rounded-2xl border border-gold/20 bg-black p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl text-foreground">
            Telegram
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            Control del acceso VIP por Telegram.
          </p>
        </div>

        <div className="rounded-full border border-gold/20 bg-black px-3 py-1.5 text-xs text-foreground">
          Estado:{" "}
          <span className="font-medium text-gold">
            {maintenance
              ? "Mantenimiento"
              : "Activo"}
          </span>
        </div>
      </div>

      <div className="mt-6">
        <label
          htmlFor="telegram-maintenance-message"
          className="text-sm font-medium text-foreground"
        >
          Mensaje de mantenimiento
        </label>

        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Este mensaje será mostrado a los usuarios VIP mientras Telegram esté deshabilitado.
        </p>

        <textarea
          id="telegram-maintenance-message"
          value={message}
          onChange={(
            event
          ) => {
            setMessage(
              event.target.value
            )

            setFeedback(
              null
            )
          }}
          maxLength={300}
          rows={2}
          disabled={
            textareaDisabled
          }
          className="mt-3 w-full resize-none rounded-xl border border-gold/20 bg-black px-4 py-3 text-sm leading-6 text-foreground outline-none focus:border-gold/50 disabled:cursor-not-allowed transition-none"
        />

        <div className="mt-2 flex justify-end">
          <span className="text-xs text-muted-foreground">
            {characterCount}/300
          </span>
        </div>

        {maintenance &&
          !confirming && (
            <button
              type="button"
              disabled={
                updateMessageDisabled
              }
              onClick={() => {
                void updateMessage()
              }}
              className={
                updateMessageVisuallyDisabled
                  ? "mt-3 w-full cursor-not-allowed rounded-xl border border-gold/10 bg-black px-5 py-3 text-sm font-medium text-gold/30 transition-none"
                  : "mt-3 w-full cursor-pointer rounded-xl border border-gold/50 bg-gold/10 px-5 py-3 text-sm font-medium text-gold shadow-[0_0_18px_rgba(212,175,55,0.08)] transition-none"
              }
            >
              Actualizar mensaje
            </button>
          )}
      </div>

      {feedback && (
        <p
          className={
            feedback.type ===
              "error"
              ? "mt-4 text-sm text-red-300"
              : "mt-4 text-sm text-amber-300"
          }
        >
          {feedback.text}
        </p>
      )}

      {confirming && (
        <div className="mt-5">
          <p className="text-sm font-medium text-foreground">
            {confirming ===
            "enable"
              ? "¿Ejecutar el mantenimiento de Telegram?"
              : "¿Quitar el mantenimiento de Telegram?"}
          </p>

          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {confirming ===
            "enable"
              ? "Se bloqueará la vinculación, se retirará a los usuarios del canal y se desconectará el webhook."
              : "Telegram volverá a funcionar y los VIP activos podrán vincular nuevamente una cuenta desde cero."}
          </p>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={
                processing !==
                null
              }
              onClick={() => {
                if (
                  processing !==
                  null
                ) {
                  return
                }

                setConfirming(
                  null
                )

                setFeedback(
                  null
                )
              }}
              className="rounded-xl border border-gold/20 bg-black px-4 py-2.5 text-sm text-foreground transition-none disabled:cursor-not-allowed"
            >
              Cancelar
            </button>

            <button
              type="button"
              disabled={
                processing !==
                null
              }
              onClick={() =>
                void runAction(
                  confirming
                )
              }
              className="rounded-xl border border-gold/30 bg-gold/10 px-4 py-2.5 text-sm font-medium text-gold transition-none disabled:cursor-not-allowed"
            >
              Confirmar
            </button>
          </div>
        </div>
      )}

      {!confirming && (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              setFeedback(
                null
              )

              setConfirming(
                "enable"
              )
            }}
            disabled={
              enableDisabled
            }
            className={
              enableDisabled
                ? "flex-1 cursor-not-allowed rounded-xl border border-gold/10 bg-black px-5 py-3 text-sm font-medium text-gold/30 transition-none"
                : "flex-1 cursor-pointer rounded-xl border border-gold/50 bg-gold/10 px-5 py-3 text-sm font-medium text-gold shadow-[0_0_18px_rgba(212,175,55,0.08)] transition-none"
            }
          >
            Ejecutar mantenimiento
          </button>

          <button
            type="button"
            onClick={() => {
              setFeedback(
                null
              )

              setConfirming(
                "disable"
              )
            }}
            disabled={
              disableDisabled
            }
            className={
              disableDisabled
                ? "flex-1 cursor-not-allowed rounded-xl border border-gold/10 bg-black px-5 py-3 text-sm font-medium text-gold/30 transition-none"
                : "flex-1 cursor-pointer rounded-xl border border-gold/50 bg-gold/10 px-5 py-3 text-sm font-medium text-gold shadow-[0_0_18px_rgba(212,175,55,0.08)] transition-none"
            }
          >
            Quitar mantenimiento
          </button>
        </div>
      )}
    </section>
  )
}