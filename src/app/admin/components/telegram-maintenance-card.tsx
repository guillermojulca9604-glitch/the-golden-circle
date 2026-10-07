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
    | "success"
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
      initialState.message ||
        DEFAULT_MESSAGE
    )

  const [
    processing,
    setProcessing,
  ] =
    useState<
      "enable" |
      "disable" |
      null
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

    setConfirming(
      null
    )

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
        setState(
          body.state
        )

        setMessage(
          body.state.message ||
            DEFAULT_MESSAGE
        )
      }

      if (!response.ok) {
        setFeedback({
          type: "error",
          text:
            body.error ||
            "No se pudo completar la operación.",
        })

        return
      }

      if (
        action ===
          "enable"
      ) {
        if (
          body.cleanupComplete ===
            false
        ) {
          setFeedback({
            type:
              "warning",
            text:
              "El mantenimiento quedó activo, pero algunas tareas de Telegram necesitan revisión.",
          })

          return
        }

        setFeedback({
          type:
            "success",
          text:
            "Mantenimiento de Telegram activado correctamente.",
        })

        return
      }

      setFeedback({
        type:
          "success",
        text:
          "Telegram volvió a estar activo. Los VIP pueden vincular nuevamente su cuenta.",
      })
    } catch {
      setFeedback({
        type:
          "error",
        text:
          "No se pudo completar la operación.",
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
          ) =>
            setMessage(
              event.target.value
            )
          }
          maxLength={300}
          rows={2}
          disabled={
            processing !==
              null ||
            maintenance
          }
          className="mt-3 w-full resize-none rounded-xl border border-gold/20 bg-black px-4 py-3 text-sm leading-6 text-foreground outline-none transition focus:border-gold/50 disabled:cursor-not-allowed disabled:opacity-60"
        />

        <div className="mt-2 flex justify-end">
          <span className="text-xs text-muted-foreground">
            {characterCount}/300
          </span>
        </div>
      </div>

      {feedback && (
        <p
          className={
            feedback.type ===
              "error"
              ? "mt-4 text-sm text-red-300"
              : feedback.type ===
                  "warning"
                ? "mt-4 text-sm text-amber-300"
                : "mt-4 text-sm text-gold"
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
              onClick={() =>
                setConfirming(
                  null
                )
              }
              className="rounded-xl border border-gold/20 bg-black px-4 py-2.5 text-sm text-foreground"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={() =>
                void runAction(
                  confirming
                )
              }
              className="rounded-xl border border-gold/30 bg-gold/10 px-4 py-2.5 text-sm font-medium text-gold"
            >
              Confirmar
            </button>
          </div>
        </div>
      )}

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
              ? "flex-1 cursor-not-allowed rounded-xl border border-gold/10 bg-black px-5 py-3 text-sm font-medium text-gold/30"
              : "flex-1 cursor-pointer rounded-xl border border-gold/50 bg-gold/10 px-5 py-3 text-sm font-medium text-gold shadow-[0_0_18px_rgba(212,175,55,0.08)]"
          }
        >
          {processing ===
          "enable"
            ? "Ejecutando mantenimiento..."
            : "Ejecutar mantenimiento"}
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
              ? "flex-1 cursor-not-allowed rounded-xl border border-gold/10 bg-black px-5 py-3 text-sm font-medium text-gold/30"
              : "flex-1 cursor-pointer rounded-xl border border-gold/50 bg-gold/10 px-5 py-3 text-sm font-medium text-gold shadow-[0_0_18px_rgba(212,175,55,0.08)]"
          }
        >
          {processing ===
          "disable"
            ? "Restaurando Telegram..."
            : "Quitar mantenimiento"}
        </button>
      </div>
    </section>
  )
}