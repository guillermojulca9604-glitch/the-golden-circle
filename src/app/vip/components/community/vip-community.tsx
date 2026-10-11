
"use client"

import { useEffect, useState } from "react"

import { createClient } from "@/lib/supabase/client"

import styles from "../home/vip-home.module.css"

const APORTES_BOT_URL = "https://t.me/TGCAportes_Bot"

const DEFAULT_TELEGRAM_MAINTENANCE_MESSAGE =
  "The Golden Circle se encuentra temporalmente en mantenimiento."

type TelegramServiceStateRealtime = {
  maintenance?: boolean
  message?: string
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M20.67 3.44 2.93 10.28c-1.21.49-1.2 1.17-.22 1.47l4.55 1.42 1.75 5.36c.21.58.1.81.72.81.48 0 .69-.22.96-.48l2.19-2.13 4.56 3.37c.84.46 1.44.22 1.65-.78L22.08 5.2c.31-1.24-.47-1.8-1.41-1.76ZM8.01 12.84l10.54-6.65c.53-.32 1.01-.15.61.21l-8.7 7.86-.34 3.61-2.11-5.03Z"
      />
    </svg>
  )
}

export function VipCommunity({
  telegramLinked,
  initialTelegramMaintenance,
  telegramMaintenanceMessage,
}: {
  telegramLinked: boolean
  initialTelegramMaintenance: boolean
  telegramMaintenanceMessage: string
}) {
  const [
    telegramMaintenance,
    setTelegramMaintenance,
  ] = useState(initialTelegramMaintenance)

  const [
    currentMaintenanceMessage,
    setCurrentMaintenanceMessage,
  ] = useState(
    telegramMaintenanceMessage ||
      DEFAULT_TELEGRAM_MAINTENANCE_MESSAGE
  )

  useEffect(() => {
    setTelegramMaintenance(initialTelegramMaintenance)

    setCurrentMaintenanceMessage(
      telegramMaintenanceMessage ||
        DEFAULT_TELEGRAM_MAINTENANCE_MESSAGE
    )
  }, [
    initialTelegramMaintenance,
    telegramMaintenanceMessage,
  ])

  // Escuchar los cambios del mantenimiento existente.
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel("vip-community-telegram-service-state")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "telegram_service_state",
          filter: "id=eq.1",
        },
        (payload) => {
          const nextState =
            payload.new as TelegramServiceStateRealtime

          const nextMessage =
            typeof nextState.message === "string" &&
            nextState.message.trim()
              ? nextState.message.trim()
              : DEFAULT_TELEGRAM_MAINTENANCE_MESSAGE

          setTelegramMaintenance(
            nextState.maintenance === true
          )

          setCurrentMaintenanceMessage(nextMessage)
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [])

  return (
    <section
      className={styles.home}
      aria-labelledby="vip-community-title"
    >
      <header className={styles.homeHeader}>
        <p className={styles.welcomeLabel}>
          Bienvenido de nuevo,
        </p>

        <h1
          id="vip-community-title"
          className={styles.homeTitle}
        >
          Miembro VIP
        </h1>

        <p className={styles.homeDescription}>
          Comparte tus videos con nuestra comunidad exclusiva.
        </p>
      </header>

      <section
        className={styles.telegramSection}
        aria-label={
          telegramMaintenance
            ? "Telegram en mantenimiento"
            : "TGC Aportes"
        }
      >
        <div
          className={styles.telegramVisual}
          aria-hidden="true"
        >
          <div className={styles.telegramGlow} />
          <span className={styles.telegramOrbitOne} />
          <span className={styles.telegramOrbitTwo} />
          <span className={styles.telegramOrbitThree} />

          <div className={styles.telegramBadge}>
            <TelegramIcon />
          </div>
        </div>

        <div className={styles.telegramContent}>
          <h2 className={styles.telegramTitle}>
            {telegramMaintenance ? (
              <>
                Telegram
                <br />
                <span>en mantenimiento</span>
              </>
            ) : (
              <>
                Comparte tus videos
                <br />
                <span>con nuestra comunidad</span>
              </>
            )}
          </h2>

          <p className={styles.telegramDescription}>
            {telegramMaintenance
              ? currentMaintenanceMessage
              : telegramLinked
                ? "Envía tus aportes de forma privada mediante nuestro bot de Telegram."
                : "Vincula tu cuenta de Telegram desde Inicio para compartir tus videos."}
          </p>

          {!telegramMaintenance &&
            (telegramLinked ? (
              <a
                className={styles.telegramButton}
                href={APORTES_BOT_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  textDecoration: "none",
                }}
              >
                <span
                  className={styles.telegramButtonIcon}
                  aria-hidden="true"
                >
                  <TelegramIcon />
                </span>

                <span>Compartir contenido</span>
              </a>
            ) : (
              <div
                className={styles.telegramButton}
                aria-disabled="true"
                style={{
                  cursor: "not-allowed",
                  pointerEvents: "none",
                  transform: "scale(1)",
                  opacity: 0.55,
                }}
              >
                <span
                  className={styles.telegramButtonIcon}
                  aria-hidden="true"
                >
                  <TelegramIcon />
                </span>

                <span>Compartir contenido</span>
              </div>
            ))}
        </div>
      </section>
    </section>
  )
}
