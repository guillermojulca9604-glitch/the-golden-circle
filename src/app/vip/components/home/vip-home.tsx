"use client"

import {
  useEffect,
  useState,
} from "react"

import styles from "./vip-home.module.css"

const VIP_ACCOUNT_NAME_CHANGED_EVENT =
  "vip-account-name-changed"

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
  onSelectVideo?: (
    videoId: string
  ) => void
}

type TelegramCreateLinkResponse = {
  ok?: boolean
  url?: string
  expiresAt?: string
  error?: string
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
  accountName,
}: VipHomeProps) {
  const [
    currentAccountName,
    setCurrentAccountName,
  ] = useState(accountName)

  const [
    telegramOpening,
    setTelegramOpening,
  ] = useState(false)

  const [
    telegramMessage,
    setTelegramMessage,
  ] = useState("")

  useEffect(() => {
    setCurrentAccountName(
      accountName
    )
  }, [accountName])

  useEffect(() => {
    const handleAccountNameChange =
      (
        event: Event
      ) => {
        const nameChangeEvent =
          event as CustomEvent<string>

        const nextAccountName =
          nameChangeEvent.detail

        if (
          typeof nextAccountName !==
            "string" ||
          !nextAccountName.trim()
        ) {
          return
        }

        setCurrentAccountName(
          nextAccountName
        )
      }

    window.addEventListener(
      VIP_ACCOUNT_NAME_CHANGED_EVENT,
      handleAccountNameChange
    )

    return () => {
      window.removeEventListener(
        VIP_ACCOUNT_NAME_CHANGED_EVENT,
        handleAccountNameChange
      )
    }
  }, [])

  const handleTelegramAction =
    async () => {
      if (telegramOpening) {
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
          {currentAccountName}
        </h1>

        <p
          className={styles.homeDescription}
        >
          Disfruta del contenido exclusivo para miembros.
        </p>
      </header>

      <section
        className={styles.telegramSection}
        aria-label="Acceso a Telegram"
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
            Únete a nuestra
            <br />
            comunidad{" "}
            <span>
              en Telegram
            </span>
          </h2>

          <p
            className={styles.telegramDescription}
          >
            {telegramMessage ||
              "Todo el contenido exclusivo se comparte a través de nuestro canal privado."}
          </p>

          <button
            type="button"
            className={styles.telegramButton}
            disabled={telegramOpening}
            onClick={() => {
              void handleTelegramAction()
            }}
          >
            <span
              className={styles.telegramButtonIcon}
              aria-hidden="true"
            >
              <TelegramIcon />
            </span>

            <span>
              Unirse a Telegram
            </span>
          </button>
        </div>
      </section>
    </section>
  )
}