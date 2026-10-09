
"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"

import { createClient } from "@/lib/supabase/client"
import { VipAccountModal } from "./account/vip-account-modal"
import styles from "./vip-account-menu.module.css"

type IconProps = {
  className?: string
}

type ChangeLimit = {
  canChange: boolean
  nextChangeAt: string | null
}

type AccountLimits = {
  username: ChangeLimit
  password: ChangeLimit
}

type TelegramStatusResponse = {
  ok?: boolean
  linked?: boolean
  username?: string | null
}

type VipAccountMenuProps = {
  accountName: string
  accountEmail: string
  membershipExpiresAt: string
  initialLimits: AccountLimits
  initialHasPassword: boolean
  initialTelegramLinked: boolean
  initialTelegramUsername: string | null
}

function UserIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="8"
        r="3.2"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M5.6 19c.55-3.25 2.65-5.15 6.4-5.15s5.85 1.9 6.4 5.15"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

function LogoutIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M10.1 5.1H6.9A1.9 1.9 0 0 0 5 7v10a1.9 1.9 0 0 0 1.9 1.9h3.2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M13.9 8.2 17.7 12l-3.8 3.8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.2 12h8.2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function VipAccountMenu({
  accountEmail,
  membershipExpiresAt,
  initialTelegramLinked,
  initialTelegramUsername,
}: VipAccountMenuProps) {
  const [telegramLinked, setTelegramLinked] = useState(initialTelegramLinked)
  const [telegramUsername, setTelegramUsername] =
    useState<string | null>(initialTelegramUsername)

  const [open, setOpen] = useState(false)
  const [accountModalOpen, setAccountModalOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState("")
  const [supabase] = useState(() => createClient())

  const accountMenuRef = useRef<HTMLDivElement>(null)
  const telegramRefreshTimersRef = useRef<number[]>([])

  const clearTelegramRefreshTimers = useCallback(() => {
    for (const timerId of telegramRefreshTimersRef.current) {
      window.clearTimeout(timerId)
    }

    telegramRefreshTimersRef.current = []
  }, [])

  const refreshTelegramStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/telegram/status", {
        method: "GET",
        cache: "no-store",
      })

      const result = (await response.json()) as TelegramStatusResponse
      if (!response.ok || !result.ok) return null

      const linked = result.linked === true
      setTelegramLinked(linked)
      setTelegramUsername(
        typeof result.username === "string" && result.username.trim()
          ? result.username.trim()
          : null
      )

      return linked
    } catch {
      /*
       * Actualización silenciosa.
       * Si falla, conservamos el estado cargado al entrar a VIP.
       */
      return null
    }
  }, [])

  const refreshTelegramStatusWithRetry = useCallback(() => {
    clearTelegramRefreshTimers()

    const retryDelays = [0, 800, 1800, 3500, 6500]

    for (const delay of retryDelays) {
      const timerId = window.setTimeout(async () => {
        const linked = await refreshTelegramStatus()
        if (linked === true) {
          clearTelegramRefreshTimers()
        }
      }, delay)

      telegramRefreshTimersRef.current.push(timerId)
    }
  }, [clearTelegramRefreshTimers, refreshTelegramStatus])

  useEffect(() => {
    setTelegramLinked(initialTelegramLinked)
    setTelegramUsername(initialTelegramUsername)
  }, [initialTelegramLinked, initialTelegramUsername])

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        if (accountModalOpen) {
          refreshTelegramStatusWithRetry()
          return
        }

        void refreshTelegramStatus()
      }
    }

    const handlePageShow = () => {
      if (accountModalOpen) {
        refreshTelegramStatusWithRetry()
        return
      }

      void refreshTelegramStatus()
    }

    window.addEventListener("focus", refreshWhenVisible)
    window.addEventListener("pageshow", handlePageShow)
    document.addEventListener("visibilitychange", refreshWhenVisible)

    return () => {
      window.removeEventListener("focus", refreshWhenVisible)
      window.removeEventListener("pageshow", handlePageShow)
      document.removeEventListener("visibilitychange", refreshWhenVisible)
    }
  }, [
    accountModalOpen,
    refreshTelegramStatus,
    refreshTelegramStatusWithRetry,
  ])

  useEffect(() => {
    return () => {
      clearTelegramRefreshTimers()
    }
  }, [clearTelegramRefreshTimers])

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: PointerEvent) => {
      const accountMenu = accountMenuRef.current
      if (accountMenu && !accountMenu.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open])

  const handleOpenAccount = () => {
    refreshTelegramStatusWithRetry()
    setOpen(false)
    setAccountModalOpen(true)
  }

  const handleCloseAccount = () => {
    setAccountModalOpen(false)
  }

  const handleLogout = async () => {
    if (loggingOut) return

    setLoggingOut(true)
    setLogoutError("")

    const { error } = await supabase.auth.signOut()

    if (error) {
      setLoggingOut(false)
      setLogoutError("No se pudo cerrar la sesión. Inténtalo nuevamente.")
      return
    }

    window.location.replace("/")
  }

  return (
    <>
      <div ref={accountMenuRef} className={styles.accountMenu}>
        <button
          type="button"
          className={`${styles.accountTrigger} ${
            open ? styles.accountTriggerOpen : ""
          }`}
          aria-label={open ? "Cerrar menú de cuenta" : "Abrir menú de cuenta"}
          aria-expanded={open}
          aria-controls="vip-account-panel"
          disabled={loggingOut}
          onClick={() => setOpen((currentValue) => !currentValue)}
        >
          <span className={styles.triggerLetter} aria-hidden="true">
            M
          </span>
        </button>

        <div
          id="vip-account-panel"
          className={`${styles.accountPanel} ${
            open ? styles.accountPanelOpen : ""
          }`}
          aria-hidden={!open}
        >
          <div className={styles.accountHeader}>
            <div className={styles.accountAvatar} aria-hidden="true">
              M
            </div>

            <div className={styles.accountIdentity}>
              <p className={styles.accountName} title="Miembro VIP">
                Miembro VIP
              </p>
              <p className={styles.accountEmail} title={accountEmail}>
                {accountEmail}
              </p>
              <span className={styles.vipStatus}>
                <span className={styles.vipStatusPoint} aria-hidden="true" />
                VIP Activo
              </span>
            </div>
          </div>

          <div className={styles.accountDivider} aria-hidden="true" />

          <div className={styles.accountActions}>
            <button
              type="button"
              className={styles.accountAction}
              tabIndex={open ? 0 : -1}
              onClick={handleOpenAccount}
            >
              <UserIcon className={styles.actionIcon} />
              <span>Mi cuenta</span>
            </button>

            <button
              type="button"
              className={`${styles.accountAction} ${styles.logoutAction}`}
              tabIndex={open ? 0 : -1}
              disabled={loggingOut}
              onClick={() => { void handleLogout() }}
            >
              <LogoutIcon className={styles.actionIcon} />
              <span>Cerrar sesión</span>
            </button>

            {logoutError && (
              <p className={styles.logoutError} role="alert">
                {logoutError}
              </p>
            )}
          </div>
        </div>
      </div>

      <VipAccountModal
        open={accountModalOpen}
        accountEmail={accountEmail}
        membershipExpiresAt={membershipExpiresAt}
        telegramLinked={telegramLinked}
        telegramUsername={telegramUsername}
        onClose={handleCloseAccount}
      />
    </>
  )
}
