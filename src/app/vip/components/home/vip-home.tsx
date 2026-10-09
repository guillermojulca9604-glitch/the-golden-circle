
"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import {
  createClient,
} from "@/lib/supabase/client"

import styles from "./vip-home.module.css"

const DEFAULT_TELEGRAM_MAINTENANCE_MESSAGE =
  "The Golden Circle se encuentra temporalmente en mantenimiento."

export type VipHomeVideo = {
  id: string
  thumbnailUrl: string | null
  durationLabel: string
  progress?: number
}

type VipHomeProps = {
  accountName: string
  continueWatching: VipHomeVideo | null
  latestVideos: VipHomeVideo[]
  popularVideos: VipHomeVideo[]
  initialTelegramMaintenance: boolean
  telegramMaintenanceMessage: string
  onSelectVideo?: (
    videoId: string
  ) => void
}

type TelegramCreateLinkResponse = {
  ok?: boolean
  url?: string
  expiresAt?: string
  maintenance?: boolean
  linked?: boolean
  error?: string
}

type TelegramStatusResponse = {
  ok?: boolean
  linked?: boolean
  username?: string | null
}

type TelegramServiceStateRealtime = {
  id?: number
  maintenance?: boolean
  message?: string
}

function TelegramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M20.67 3.44 2.93 10.28c-1.21.49-1.2 1.17-.22 1.47l4.55 1.42 1.75 5.36c.21.58.1.81.72.81.48 0 .69-.22.96-.48l2.19-2.13 4.56 3.37c.84.46 1.44.22 1.65-.78L22.08 5.2c.31-1.24-.47-1.8-1.41-1.76ZM8.01 12.84l10.54-6.65c.53-.32 1.01-.15.61.21l-8.7 7.86-.34 3.61-2.11-5.03Z"
      />
    </svg>
  )
}

export function VipHome({
  initialTelegramMaintenance,
  telegramMaintenanceMessage,
}: VipHomeProps) {
  const supabase =
    useMemo(
      () => createClient(),
      []
    )

  const [
    telegramOpening,
    setTelegramOpening,
  ] =
    useState(false)

  const [
    telegramMessage,
    setTelegramMessage,
  ] =
    useState("")

  const [
    telegramLinked,
    setTelegramLinked,
  ] =
    useState(false)

  const [
    telegramMaintenance,
    setTelegramMaintenance,
  ] =
    useState(
      initialTelegramMaintenance
    )

  const [
    currentMaintenanceMessage,
    setCurrentMaintenanceMessage,
  ] =
    useState(
      telegramMaintenanceMessage ||
        DEFAULT_TELEGRAM_MAINTENANCE_MESSAGE
    )

  const telegramRefreshTimersRef =
    useRef<number[]>([])

  const clearTelegramRefreshTimers =
    useCallback(() => {
      for (
        const timerId of
        telegramRefreshTimersRef.current
      ) {
        window.clearTimeout(
          timerId
        )
      }

      telegramRefreshTimersRef.current =
        []
    }, [])

  const refreshTelegramStatus =
    useCallback(async () => {
      try {
        const response =
          await fetch(
            "/api/telegram/status",
            {
              method: "GET",
              cache: "no-store",
            }
          )

        const result =
          (await response.json()) as
            TelegramStatusResponse

        if (
          !response.ok ||
          !result.ok
        ) {
          return null
        }

        const linked =
          result.linked === true

        setTelegramLinked(
          linked
        )

        if (linked) {
          setTelegramMessage(
            ""
          )
        }

        return linked
      } catch {
        return null
      }
    }, [])

  const refreshTelegramStatusWithRetry =
    useCallback(() => {
      clearTelegramRefreshTimers()

      const retryDelays = [
        0,
        800,
        1800,
        3500,
        6500,
      ]

      for (
        const delay of retryDelays
      ) {
        const timerId =
          window.setTimeout(
            async () => {
              const linked =
                await refreshTelegramStatus()

              if (
                linked === true
              ) {
                clearTelegramRefreshTimers()
              }
            },
            delay
          )

        telegramRefreshTimersRef
          .current
          .push(
            timerId
          )
      }
    }, [
      clearTelegramRefreshTimers,
      refreshTelegramStatus,
    ])

  useEffect(() => {
    setTelegramMaintenance(
      initialTelegramMaintenance
    )

    setCurrentMaintenanceMessage(
      telegramMaintenanceMessage ||
        DEFAULT_TELEGRAM_MAINTENANCE_MESSAGE
    )
  }, [
    initialTelegramMaintenance,
    telegramMaintenanceMessage,
  ])

  useEffect(() => {
    void refreshTelegramStatus()
  }, [refreshTelegramStatus])

  useEffect(() => {
    const refreshWhenVisible =
      () => {
        if (
          document.visibilityState !==
          "visible"
        ) {
          return
        }

        refreshTelegramStatusWithRetry()
      }

    const handlePageShow =
      () => {
        refreshTelegramStatusWithRetry()
      }

    window.addEventListener(
      "focus",
      refreshWhenVisible
    )

    window.addEventListener(
      "pageshow",
      handlePageShow
    )

    document.addEventListener(
      "visibilitychange",
      refreshWhenVisible
    )

    return () => {
      window.removeEventListener(
        "focus",
        refreshWhenVisible
      )

      window.removeEventListener(
        "pageshow",
        handlePageShow
      )

      document.removeEventListener(
        "visibilitychange",
        refreshWhenVisible
      )
    }
  }, [
    refreshTelegramStatusWithRetry,
  ])

  useEffect(() => {
    return () => {
      clearTelegramRefreshTimers()
    }
  }, [
    clearTelegramRefreshTimers,
  ])

  useEffect(() => {
    const channel =
      supabase
        .channel(
          "vip-telegram-service-state"
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table:
              "telegram_service_state",
            filter:
              "id=eq.1",
          },
          (payload) => {
            const nextState =
              payload.new as
                TelegramServiceStateRealtime

            const nextMaintenance =
              nextState
                .maintenance ===
              true

            const nextMessage =
              typeof nextState
                .message ===
                "string" &&
              nextState.message.trim()
                ? nextState.message.trim()
                : DEFAULT_TELEGRAM_MAINTENANCE_MESSAGE

            setTelegramMaintenance(
              nextMaintenance
            )

            setCurrentMaintenanceMessage(
              nextMessage
            )

            if (
              nextMaintenance
            ) {
              clearTelegramRefreshTimers()

              setTelegramMessage(
                ""
              )

              setTelegramOpening(
                false
              )

              return
            }

            void refreshTelegramStatus()
          }
        )
        .subscribe()

    return () => {
      void supabase
        .removeChannel(
          channel
        )
    }
  }, [
    supabase,
    clearTelegramRefreshTimers,
    refreshTelegramStatus,
  ])

  const handleTelegramAction =
    async () => {
      if (
        telegramOpening ||
        telegramMaintenance ||
        telegramLinked
      ) {
        return
      }

      setTelegramOpening(true)
      setTelegramMessage("")

      try {
        const response =
          await fetch(
            "/api/telegram/create-link",
            {
              method: "POST",
            }
          )

        const result =
          (await response.json()) as
            TelegramCreateLinkResponse

        if (
          result.maintenance ===
            true
        ) {
          setTelegramMaintenance(
            true
          )

          setCurrentMaintenanceMessage(
            result.error ||
              DEFAULT_TELEGRAM_MAINTENANCE_MESSAGE
          )

          setTelegramMessage("")

          return
        }

        if (
          result.linked === true
        ) {
          setTelegramLinked(
            true
          )

          setTelegramMessage(
            ""
          )

          return
        }

        if (
          !response.ok ||
          !result.ok ||
          !result.url
        ) {
          setTelegramMessage(
            result.error ||
              "No se pudo preparar el acceso a Telegram."
          )

          return
        }

        window.location.href =
          result.url
      } catch {
        setTelegramMessage(
          "No se pudo preparar el acceso a Telegram."
        )
      } finally {
        setTelegramOpening(false)
      }
    }

  return (
    <section
      className={styles.home}
      aria-labelledby="vip-home-title"
    >
      <header
        className={styles.homeHeader}
      >
        <p
          className={styles.welcomeLabel}
        >
          Bienvenido de nuevo,
        </p>

        <h1
          id="vip-home-title"
          className={styles.homeTitle}
        >
          Miembro VIP
        </h1>

        <p
          className={styles.homeDescription}
        >
          Disfruta del contenido exclusivo para miembros.
        </p>
      </header>

      <section
        className={styles.telegramSection}
        aria-label={
          telegramMaintenance
            ? "Telegram en mantenimiento"
            : telegramLinked
              ? "Cuenta de Telegram vinculada"
              : "Acceso a Telegram"
        }
      >
        <div
          className={styles.telegramVisual}
          aria-hidden="true"
        >
          <div
            className={styles.telegramGlow}
          />

          <span
            className={styles.telegramOrbitOne}
          />

          <span
            className={styles.telegramOrbitTwo}
          />

          <span
            className={styles.telegramOrbitThree}
          />

          <div
            className={styles.telegramBadge}
          >
            <TelegramIcon />
          </div>
        </div>

        <div
          className={styles.telegramContent}
        >
          <h2
            className={styles.telegramTitle}
          >
            {telegramMaintenance
              ? (
                <>
                  Telegram
                  <br />
                  <span>
                    en mantenimiento
                  </span>
                </>
              )
              : (
                <>
                  Únete a nuestra
                  <br />
                  comunidad{" "}
                  <span>
                    en Telegram
                  </span>
                </>
              )}
          </h2>

          <p
            className={styles.telegramDescription}
          >
            {telegramMaintenance
              ? currentMaintenanceMessage
              : telegramMessage ||
                "Todo el contenido exclusivo se comparte a través de nuestro canal privado."}
          </p>

          {!telegramMaintenance && (
            telegramLinked
              ? (
                <div
                  className={
                    styles.telegramButton
                  }
                  role="status"
                  aria-label="Cuenta de Telegram vinculada"
                  style={{
                    cursor:
                      "default",
                    pointerEvents:
                      "none",
                    transform:
                      "scale(1)",
                  }}
                >
                  <span
                    className={
                      styles.telegramButtonIcon
                    }
                    aria-hidden="true"
                  >
                    <TelegramIcon />
                  </span>

                  <span>
                    Cuenta vinculada
                  </span>
                </div>
              )
              : (
                <button
                  type="button"
                  className={
                    styles.telegramButton
                  }
                  onClick={() => {
                    void handleTelegramAction()
                  }}
                >
                  <span
                    className={
                      styles.telegramButtonIcon
                    }
                    aria-hidden="true"
                  >
                    <TelegramIcon />
                  </span>

                  <span>
                    Vincular cuenta
                  </span>
                </button>
              )
          )}
        </div>
      </section>
    </section>
  )
}
