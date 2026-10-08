"use client"

import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"

import {
  logoutToHome,
} from "@/lib/auth/logout-to-home"

import {
  createClient,
} from "@/lib/supabase/client"

type AdminAccountMenuProps = {
  accountName: string
  accountEmail: string
}

type ChangePasswordResponse = {
  success?: boolean
  message?: string
  error?: string
}

type PasswordFieldProps = {
  id: string
  label: string
  value: string
  autoComplete:
    | "current-password"
    | "new-password"
  visible: boolean
  disabled: boolean
  inputRef?:
    React.RefObject<HTMLInputElement | null>
  onChange: (
    value: string
  ) => void
  onToggleVisibility:
    () => void
}

function getInitial(
  accountName: string
) {
  const initial =
    accountName
      .trim()
      .charAt(0)
      .toUpperCase()

  return initial || "A"
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
    >
      <path
        d="M6 6l12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function PasswordIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
    >
      <rect
        x="4"
        y="10"
        width="16"
        height="10"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />

      <path
        d="M8 10V7.5a4 4 0 0 1 8 0V10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      <circle
        cx="12"
        cy="15"
        r="1.2"
        fill="currentColor"
      />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
    >
      <path
        d="M10 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      <path
        d="m14 8 4 4-4 4M9 12h9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function EyeIcon({
  hidden,
}: {
  hidden: boolean
}) {
  if (hidden) {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-5 w-5"
        fill="none"
      >
        <path
          d="M3 3l18 18"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        <path
          d="M10.6 6.2A9.7 9.7 0 0 1 12 6c6 0 9 6 9 6a14 14 0 0 1-2.1 2.8M14.1 14.2A3 3 0 0 1 9.8 9.9M6.2 7.2A14.8 14.8 0 0 0 3 12s3 6 9 6a9.7 9.7 0 0 0 3.1-.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
    >
      <path
        d="M3 12s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <circle
        cx="12"
        cy="12"
        r="3"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  )
}

function PasswordField({
  id,
  label,
  value,
  autoComplete,
  visible,
  disabled,
  inputRef,
  onChange,
  onToggleVisibility,
}: PasswordFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-xs font-medium text-foreground/85"
      >
        {label}
      </label>

      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type={
            visible
              ? "text"
              : "password"
          }
          autoComplete={
            autoComplete
          }
          value={value}
          disabled={disabled}
          onChange={(event) => {
            onChange(
              event.target.value
            )
          }}
          className="h-12 w-full rounded-xl border border-gold/25 bg-white/[0.025] px-4 pr-13 text-sm text-foreground outline-none transition-colors placeholder:text-foreground/35 hover:border-gold/35 focus:border-gold/60 disabled:cursor-default disabled:opacity-55"
        />

        <button
          type="button"
          aria-label={
            visible
              ? `Ocultar ${label.toLowerCase()}`
              : `Mostrar ${label.toLowerCase()}`
          }
          title={
            visible
              ? "Ocultar contraseña"
              : "Mostrar contraseña"
          }
          disabled={disabled}
          onClick={
            onToggleVisibility
          }
          className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-gold/70 transition-colors hover:bg-gold/[0.06] hover:text-gold focus-visible:bg-gold/[0.06] focus-visible:text-gold focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
        >
          <EyeIcon
            hidden={visible}
          />
        </button>
      </div>
    </div>
  )
}

export function AdminAccountMenu({
  accountName,
  accountEmail,
}: AdminAccountMenuProps) {
  const [supabase] =
    useState(
      () => createClient()
    )

  const [menuOpen, setMenuOpen] =
    useState(false)

  const [
    passwordModalOpen,
    setPasswordModalOpen,
  ] = useState(false)

  const [
    currentPassword,
    setCurrentPassword,
  ] = useState("")

  const [
    newPassword,
    setNewPassword,
  ] = useState("")

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("")

  const [
    showCurrentPassword,
    setShowCurrentPassword,
  ] = useState(false)

  const [
    showNewPassword,
    setShowNewPassword,
  ] = useState(false)

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false)

  const [saving, setSaving] =
    useState(false)

  const [
    loggingOut,
    setLoggingOut,
  ] = useState(false)

  const [formError, setFormError] =
    useState("")

  const [
    formSuccess,
    setFormSuccess,
  ] = useState("")

  const [
    logoutError,
    setLogoutError,
  ] = useState("")

  const menuRef =
    useRef<HTMLDivElement>(null)

  const currentPasswordRef =
    useRef<HTMLInputElement>(
      null
    )

  const accountInitial =
    getInitial(accountName)

  const resetPasswordForm =
    useCallback(() => {
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")

      setShowCurrentPassword(
        false
      )

      setShowNewPassword(false)

      setShowConfirmPassword(
        false
      )

      setFormError("")
      setFormSuccess("")
    }, [])

  const closePasswordModal =
    useCallback(() => {
      if (saving) {
        return
      }

      setPasswordModalOpen(false)
      resetPasswordForm()
    }, [
      saving,
      resetPasswordForm,
    ])

  useEffect(() => {
    if (!menuOpen) {
      return
    }

    const handlePointerDown = (
      event: PointerEvent
    ) => {
      const menu =
        menuRef.current

      if (
        menu &&
        !menu.contains(
          event.target as Node
        )
      ) {
        setMenuOpen(false)
      }
    }

    const handleKeyDown = (
      event: KeyboardEvent
    ) => {
      if (
        event.key === "Escape"
      ) {
        setMenuOpen(false)
      }
    }

    document.addEventListener(
      "pointerdown",
      handlePointerDown
    )

    document.addEventListener(
      "keydown",
      handleKeyDown
    )

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown
      )

      document.removeEventListener(
        "keydown",
        handleKeyDown
      )
    }
  }, [menuOpen])

  useEffect(() => {
    if (!passwordModalOpen) {
      return
    }

    const previousOverflow =
      document.body.style
        .overflow

    document.body.style.overflow =
      "hidden"

    const focusTimer =
      window.setTimeout(() => {
        currentPasswordRef
          .current
          ?.focus()
      }, 40)

    const handleKeyDown = (
      event: KeyboardEvent
    ) => {
      if (
        event.key ===
        "Escape"
      ) {
        closePasswordModal()
      }
    }

    document.addEventListener(
      "keydown",
      handleKeyDown
    )

    return () => {
      window.clearTimeout(
        focusTimer
      )

      document.body.style.overflow =
        previousOverflow

      document.removeEventListener(
        "keydown",
        handleKeyDown
      )
    }
  }, [
    passwordModalOpen,
    closePasswordModal,
  ])

  const openPasswordModal =
    () => {
      setMenuOpen(false)
      resetPasswordForm()
      setPasswordModalOpen(true)
    }

  const handlePasswordChange =
    async (
      event:
        FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault()

      if (saving) {
        return
      }

      setFormError("")
      setFormSuccess("")

      if (!currentPassword) {
        setFormError(
          "Ingresa tu contraseña actual."
        )

        return
      }

      if (
        newPassword.length < 12 ||
        newPassword.length > 24
      ) {
        setFormError(
          "La nueva contraseña debe tener entre 12 y 24 caracteres."
        )

        return
      }

      if (
        newPassword !==
        confirmPassword
      ) {
        setFormError(
          "Las nuevas contraseñas no coinciden."
        )

        return
      }

      if (
        newPassword ===
        currentPassword
      ) {
        setFormError(
          "La nueva contraseña debe ser diferente a la actual."
        )

        return
      }

      setSaving(true)

      try {
        const response =
          await fetch(
            "/api/admin/change-password",
            {
              method: "POST",

              credentials:
                "same-origin",

              cache: "no-store",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  currentPassword,
                  newPassword,
                  confirmPassword,
                }),
            }
          )

        const result =
          (
            await response
              .json()
              .catch(
                () => ({})
              )
          ) as
            ChangePasswordResponse

        if (
          !response.ok ||
          !result.success
        ) {
          setFormError(
            result.error ||
              "No se pudo cambiar la contraseña."
          )

          return
        }

        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")

        setShowCurrentPassword(
          false
        )

        setShowNewPassword(false)

        setShowConfirmPassword(
          false
        )

        setFormSuccess(
          result.message ||
            "Contraseña cambiada correctamente."
        )
      } catch {
        setFormError(
          "No se pudo conectar con el servidor. Inténtalo nuevamente."
        )
      } finally {
        setSaving(false)
      }
    }

  const handleLogout =
    async () => {
      if (loggingOut) {
        return
      }

      setLoggingOut(true)
      setLogoutError("")
      setMenuOpen(false)

      try {
        await logoutToHome(
          supabase
        )
      } catch {
        setLoggingOut(false)
        setMenuOpen(true)

        setLogoutError(
          "No se pudo cerrar la sesión. Inténtalo nuevamente."
        )
      }
    }

  return (
    <>
      <div
        ref={menuRef}
        className="fixed right-4 top-4 z-[70] sm:right-6 sm:top-5"
      >
        <button
          type="button"
          aria-label={
            menuOpen
              ? "Cerrar menú administrativo"
              : "Abrir menú administrativo"
          }
          aria-expanded={menuOpen}
          aria-controls="admin-account-panel"
          disabled={loggingOut}
          onClick={() => {
            setMenuOpen(
              (current) =>
                !current
            )
          }}
          className={`flex h-11 w-11 items-center justify-center rounded-full border bg-black font-serif text-sm text-gold shadow-[0_0_14px_rgba(214,143,29,0.08)] transition-colors focus-visible:outline-none ${
            menuOpen
              ? "border-gold/65 bg-gold/[0.08]"
              : "border-gold/35 hover:border-gold/60 hover:bg-gold/[0.05]"
          } disabled:cursor-default disabled:opacity-60`}
        >
          {accountInitial}
        </button>

        <div
          id="admin-account-panel"
          aria-hidden={!menuOpen}
          className={`absolute right-0 top-14 w-[290px] overflow-hidden rounded-2xl border border-gold/25 bg-[#070706]/98 p-4 shadow-[0_22px_70px_rgba(0,0,0,0.72)] backdrop-blur-xl transition-[opacity,visibility] duration-150 ${
            menuOpen
              ? "visible opacity-100"
              : "invisible pointer-events-none opacity-0"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              aria-hidden="true"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gold/45 bg-gold/[0.04] font-serif text-lg text-gold"
            >
              {accountInitial}
            </div>

            <div className="min-w-0">
              <p
                title={accountName}
                className="truncate text-sm font-medium text-foreground"
              >
                {accountName}
              </p>

              <p
                title={accountEmail}
                className="mt-1 truncate text-xs text-muted-foreground"
              >
                {accountEmail}
              </p>

              <span className="mt-2 flex items-center gap-1.5 text-[11px] text-gold/85">
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full bg-gold shadow-[0_0_7px_rgba(214,143,29,0.45)]"
                />

                Administrador
              </span>
            </div>
          </div>

          <div
            aria-hidden="true"
            className="my-4 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent"
          />

          <div className="space-y-1">
            <button
              type="button"
              tabIndex={
                menuOpen ? 0 : -1
              }
              disabled={loggingOut}
              onClick={
                openPasswordModal
              }
              className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-transparent px-3 text-left text-sm text-foreground/85 transition-colors hover:border-gold/15 hover:bg-gold/[0.045] hover:text-foreground focus-visible:border-gold/20 focus-visible:bg-gold/[0.045] focus-visible:outline-none disabled:pointer-events-none disabled:opacity-55"
            >
              <PasswordIcon />

              Cambiar contraseña
            </button>

            <button
              type="button"
              tabIndex={
                menuOpen ? 0 : -1
              }
              disabled={loggingOut}
              onClick={() => {
                void handleLogout()
              }}
              className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-transparent px-3 text-left text-sm text-[#df6937] transition-colors hover:border-[#dc5824]/15 hover:bg-[#a62f11]/10 hover:text-[#ed7748] focus-visible:border-[#dc5824]/15 focus-visible:bg-[#a62f11]/10 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-55"
            >
              <LogoutIcon />

              {loggingOut
                ? "Cerrando sesión..."
                : "Cerrar sesión"}
            </button>

            {logoutError && (
              <p
                role="alert"
                className="px-3 pt-2 text-xs leading-5 text-[#ed7748]"
              >
                {logoutError}
              </p>
            )}
          </div>
        </div>
      </div>

      {passwordModalOpen && (
        <div
          role="presentation"
          onPointerDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closePasswordModal()
            }
          }}
          className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center overflow-y-auto bg-black/65 p-4 backdrop-blur-sm sm:p-6"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-password-title"
            className="relative w-full max-w-[470px] rounded-[22px] border border-gold/30 bg-[#080807] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.78)] sm:p-7"
          >
            <button
              type="button"
              aria-label="Cerrar cambio de contraseña"
              disabled={saving}
              onClick={
                closePasswordModal
              }
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-foreground/60 transition-colors hover:border-gold/15 hover:bg-white/[0.035] hover:text-foreground focus-visible:border-gold/20 focus-visible:bg-white/[0.035] focus-visible:text-foreground focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
            >
              <CloseIcon />
            </button>

            <div className="pr-12">
              <h2
                id="admin-password-title"
                className="font-serif text-2xl font-normal text-foreground"
              >
                Cambiar contraseña
              </h2>

              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Confirma tu contraseña actual y establece una nueva. La cuenta administrativa no tiene tiempo de espera entre cambios.
              </p>
            </div>

            <form
              onSubmit={
                handlePasswordChange
              }
              className="mt-7 space-y-5"
            >
              <PasswordField
                id="admin-current-password"
                label="Contraseña actual"
                value={currentPassword}
                autoComplete="current-password"
                visible={
                  showCurrentPassword
                }
                disabled={saving}
                inputRef={
                  currentPasswordRef
                }
                onChange={(value) => {
                  setCurrentPassword(
                    value
                  )

                  setFormError("")
                  setFormSuccess("")
                }}
                onToggleVisibility={() => {
                  setShowCurrentPassword(
                    (current) =>
                      !current
                  )
                }}
              />

              <PasswordField
                id="admin-new-password"
                label="Nueva contraseña"
                value={newPassword}
                autoComplete="new-password"
                visible={
                  showNewPassword
                }
                disabled={saving}
                onChange={(value) => {
                  setNewPassword(value)
                  setFormError("")
                  setFormSuccess("")
                }}
                onToggleVisibility={() => {
                  setShowNewPassword(
                    (current) =>
                      !current
                  )
                }}
              />

              <PasswordField
                id="admin-confirm-password"
                label="Confirmar nueva contraseña"
                value={confirmPassword}
                autoComplete="new-password"
                visible={
                  showConfirmPassword
                }
                disabled={saving}
                onChange={(value) => {
                  setConfirmPassword(
                    value
                  )

                  setFormError("")
                  setFormSuccess("")
                }}
                onToggleVisibility={() => {
                  setShowConfirmPassword(
                    (current) =>
                      !current
                  )
                }}
              />

              <p className="text-[11px] leading-5 text-muted-foreground">
                La nueva contraseña debe tener entre 12 y 24 caracteres.
              </p>

              {formError && (
                <p
                  role="alert"
                  className="text-xs leading-5 text-[#ed7748]"
                >
                  {formError}
                </p>
              )}

              {formSuccess && (
                <p
                  role="status"
                  className="text-xs leading-5 text-gold"
                >
                  {formSuccess}
                </p>
              )}

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={saving}
                  onClick={
                    closePasswordModal
                  }
                  className="min-h-11 rounded-xl border border-white/10 bg-white/[0.025] px-5 text-sm text-foreground/80 transition-colors hover:border-white/15 hover:bg-white/[0.045] hover:text-foreground focus-visible:border-white/20 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="min-h-11 rounded-xl border border-gold/50 bg-gold/[0.12] px-5 text-sm font-medium text-gold transition-colors hover:border-gold/70 hover:bg-gold/[0.18] focus-visible:border-gold/80 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-55"
                >
                  {saving
                    ? "Guardando..."
                    : "Guardar contraseña"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  )
}