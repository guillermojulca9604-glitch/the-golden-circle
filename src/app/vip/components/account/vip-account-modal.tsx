"use client"

import {
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import { createPortal } from "react-dom"

import styles from "./vip-account-modal.module.css"

const MINIMUM_USERNAME_LENGTH = 4
const MAXIMUM_USERNAME_LENGTH = 10

const MINIMUM_PASSWORD_LENGTH = 12
const MAXIMUM_PASSWORD_LENGTH = 24

const reservedUsernamePrefixes = [
  "admin",
  "administrator",
  "administrador",
  "moderador",
  "moderator",
  "soporte",
  "support",
  "staff",
  "owner",
  "root",
  "oficial",
  "official",
  "sistema",
  "system",
  "vip",
  "golden",
  "thegolden",
  "goldencircle",
  "thegoldencircle",
  "cuenta",
  "account",
  "perfil",
  "profile",
  "usuario",
  "user",
  "seguridad",
  "security",
  "ayuda",
  "help",
  "servicio",
  "service",
  "webmaster",
  "developer",
  "desarrollador",
]

type ChangeLimit = {
  canChange: boolean
  nextChangeAt: string | null
}

type AccountLimits = {
  username: ChangeLimit
  password: ChangeLimit
}

type VipAccountModalProps = {
  open: boolean
  accountName: string
  accountEmail: string
  membershipExpiresAt: string
  initialLimits: AccountLimits
  onLimitsChange: (
    limits: AccountLimits
  ) => void
  onAccountNameChange: (
    accountName: string
  ) => void
  onClose: () => void
}

type ChangeResponse = {
  success?: boolean
  username?: string
  nextChangeAt?: string | null
  error?: string
}

function capitalizeUsername(
  value: string
) {
  if (!value) {
    return ""
  }

  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  )
}

function sanitizeUsername(
  value: string
) {
  const withoutAccents = value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )

  const onlyLettersAndNumbers =
    withoutAccents.replace(
      /[^A-Za-z0-9]/g,
      ""
    )

  const beginningWithLetter =
    onlyLettersAndNumbers.replace(
      /^[0-9]+/,
      ""
    )

  const limitedUsername =
    beginningWithLetter.slice(
      0,
      MAXIMUM_USERNAME_LENGTH
    )

  return capitalizeUsername(
    limitedUsername
  )
}

function normalizeUsernameForSecurity(
  value: string
) {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/8/g, "b")
}

function removeTrailingNumbers(
  value: string
) {
  return value.replace(
    /[0-9]+$/,
    ""
  )
}

function isReservedUsername(
  value: string
) {
  const lowercaseValue =
    value.toLowerCase()

  const valueWithoutTrailingNumbers =
    removeTrailingNumbers(
      lowercaseValue
    )

  const normalizedValue =
    normalizeUsernameForSecurity(
      value
    )

  const normalizedWithoutTrailingNumbers =
    normalizeUsernameForSecurity(
      valueWithoutTrailingNumbers
    )

  return reservedUsernamePrefixes.some(
    (reservedName) => {
      return (
        lowercaseValue.startsWith(
          reservedName
        ) ||
        valueWithoutTrailingNumbers.startsWith(
          reservedName
        ) ||
        normalizedValue.startsWith(
          reservedName
        ) ||
        normalizedWithoutTrailingNumbers.startsWith(
          reservedName
        )
      )
    }
  )
}

function isUsernameComplete(
  value: string
) {
  if (
    value.length <
      MINIMUM_USERNAME_LENGTH ||
    value.length >
      MAXIMUM_USERNAME_LENGTH
  ) {
    return false
  }

  if (
    !/^[A-Z][A-Za-z0-9]*$/.test(
      value
    )
  ) {
    return false
  }

  return !isReservedUsername(value)
}

function formatExpirationDate(
  value: string
) {
  if (!value) {
    return "No disponible"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "No disponible"
  }

  return new Intl.DateTimeFormat(
    "es-PE",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  ).format(date)
}

function formatNextChangeDate(
  value: string | null
) {
  if (!value) {
    return ""
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ""
  }

  return new Intl.DateTimeFormat(
    "es-PE",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  ).format(date)
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m7 7 10 10M17 7 7 17"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function CrownIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m4.5 8 3.2 3.1L12 5.6l4.3 5.5L19.5 8l-1.2 9H5.7L4.5 8Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M6.2 19h11.6"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg
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

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="5.5"
        y="10"
        width="13"
        height="9.5"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.4"
      />

      <path
        d="M8.2 10V7.6a3.8 3.8 0 0 1 7.6 0V10"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />

      <circle
        cx="12"
        cy="14.8"
        r="1"
        fill="currentColor"
      />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m9.5 6.5 5.5 5.5-5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <circle
        cx="12"
        cy="12"
        r="2.75"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M3.25 3.25 20.75 20.75"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />

      <circle
        cx="12"
        cy="12"
        r="2.75"
        fill="#080808"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  )
}

export function VipAccountModal({
  open,
  accountName,
  accountEmail,
  membershipExpiresAt,
  initialLimits,
  onLimitsChange,
  onAccountNameChange,
  onClose,
}: VipAccountModalProps) {
  const currentPasswordRef =
    useRef<HTMLInputElement>(null)

  const newPasswordRef =
    useRef<HTMLInputElement>(null)

  const confirmPasswordRef =
    useRef<HTMLInputElement>(null)

  const [
    editNameOpen,
    setEditNameOpen,
  ] = useState(false)

  const [
    changePasswordOpen,
    setChangePasswordOpen,
  ] = useState(false)

  const [
    username,
    setUsername,
  ] = useState(accountName)

  const [
    savingUsername,
    setSavingUsername,
  ] = useState(false)

  const [
    usernameMessage,
    setUsernameMessage,
  ] = useState("")

  const [
    usernameSuccess,
    setUsernameSuccess,
  ] = useState("")

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

  const [
    changingPassword,
    setChangingPassword,
  ] = useState(false)

  const [
    passwordMessage,
    setPasswordMessage,
  ] = useState("")

  const [
    passwordSuccess,
    setPasswordSuccess,
  ] = useState("")

  const [
    usernameLimit,
    setUsernameLimit,
  ] = useState<ChangeLimit>(
    initialLimits.username
  )

  const [
    passwordLimit,
    setPasswordLimit,
  ] = useState<ChangeLimit>(
    initialLimits.password
  )

  const usernameIsReserved =
    useMemo(
      () =>
        username.length > 0 &&
        isReservedUsername(
          username
        ),
      [username]
    )

  const usernameIsComplete =
    useMemo(
      () =>
        isUsernameComplete(
          username
        ),
      [username]
    )

  const newPasswordLengthIsValid =
    newPassword.length >=
      MINIMUM_PASSWORD_LENGTH &&
    newPassword.length <=
      MAXIMUM_PASSWORD_LENGTH

  const passwordsMatch =
    confirmPassword.length > 0 &&
    newPassword === confirmPassword

  const newPasswordIsDifferent =
    currentPassword.length > 0 &&
    newPassword !== currentPassword

  const passwordFormIsComplete =
    currentPassword.length > 0 &&
    newPasswordLengthIsValid &&
    passwordsMatch &&
    newPasswordIsDifferent &&
    accountEmail.trim().length > 0

  const accountInitial =
    accountName
      .trim()
      .charAt(0)
      .toUpperCase() || "U"

  const expirationDate =
    useMemo(
      () =>
        formatExpirationDate(
          membershipExpiresAt
        ),
      [membershipExpiresAt]
    )

  useEffect(() => {
    setUsername(accountName)
  }, [accountName])

  useEffect(() => {
    setUsernameLimit(
      initialLimits.username
    )

    setPasswordLimit(
      initialLimits.password
    )
  }, [initialLimits])

  useEffect(() => {
    if (!open) {
      setEditNameOpen(false)
      setChangePasswordOpen(false)

      setUsername(accountName)
      setUsernameMessage("")
      setUsernameSuccess("")

      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")

      setShowCurrentPassword(false)
      setShowNewPassword(false)
      setShowConfirmPassword(false)

      setPasswordMessage("")
      setPasswordSuccess("")

      return
    }

    const handleKeyDown = (
      event: globalThis.KeyboardEvent
    ) => {
      if (event.key !== "Escape") {
        return
      }

      if (changePasswordOpen) {
        if (changingPassword) {
          return
        }

        setChangePasswordOpen(false)
        setPasswordMessage("")
        setPasswordSuccess("")

        return
      }

      if (editNameOpen) {
        if (savingUsername) {
          return
        }

        setEditNameOpen(false)
        setUsername(accountName)
        setUsernameMessage("")
        setUsernameSuccess("")

        return
      }

      onClose()
    }

    document.addEventListener(
      "keydown",
      handleKeyDown
    )

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      )
    }
  }, [
    accountName,
    changePasswordOpen,
    changingPassword,
    editNameOpen,
    onClose,
    open,
    savingUsername,
  ])

  if (
    !open ||
    typeof document === "undefined"
  ) {
    return null
  }

  const clearPasswordMessages = () => {
    setPasswordMessage("")
    setPasswordSuccess("")
  }

  const handleBackdropClick = (
    event: MouseEvent<HTMLDivElement>
  ) => {
    if (
      event.target ===
        event.currentTarget &&
      !editNameOpen &&
      !changePasswordOpen
    ) {
      onClose()
    }
  }

  const handleOpenEditName = () => {
    if (!usernameLimit.canChange) {
      return
    }

    setUsername(accountName)
    setUsernameMessage("")
    setUsernameSuccess("")
    setEditNameOpen(true)
  }

  const handleCloseEditName = () => {
    if (savingUsername) {
      return
    }

    setEditNameOpen(false)
    setUsername(accountName)
    setUsernameMessage("")
    setUsernameSuccess("")
  }

  const handleUsernameChange = (
    value: string
  ) => {
    setUsername(
      sanitizeUsername(value)
    )

    setUsernameMessage("")
    setUsernameSuccess("")
  }

  const handleUsernameKeyDown = (
    event: KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === " ") {
      event.preventDefault()
    }
  }

  const handleSaveUsername = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()

    if (
      !usernameIsComplete ||
      savingUsername ||
      !usernameLimit.canChange
    ) {
      return
    }

    if (username === accountName) {
      setEditNameOpen(false)
      return
    }

    setSavingUsername(true)
    setUsernameMessage("")
    setUsernameSuccess("")

    try {
      const response =
        await fetch(
          "/api/vip/change-username",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              username,
            }),
          }
        )

      const result =
        (await response.json()) as
          ChangeResponse

      if (
        !response.ok ||
        !result.success ||
        !result.username
      ) {
        if (result.nextChangeAt) {
          const nextLimit = {
            canChange: false,
            nextChangeAt:
              result.nextChangeAt,
          }

          setUsernameLimit(
            nextLimit
          )

          onLimitsChange({
            username:
              nextLimit,

            password:
              passwordLimit,
          })
        }

        setUsernameMessage(
          result.error ||
            "No pudimos guardar tu nombre. Inténtalo nuevamente."
        )

        return
      }

      onAccountNameChange(
        result.username
      )

      const nextLimit = {
        canChange: false,
        nextChangeAt:
          result.nextChangeAt ??
          null,
      }

      setUsernameLimit(
        nextLimit
      )

      onLimitsChange({
        username:
          nextLimit,

        password:
          passwordLimit,
      })

      setUsernameSuccess(
        "Nombre actualizado correctamente."
      )

      window.setTimeout(() => {
        setEditNameOpen(false)
        setUsernameSuccess("")
      }, 800)
    } catch {
      setUsernameMessage(
        "No pudimos guardar tu nombre. Inténtalo nuevamente."
      )
    } finally {
      setSavingUsername(false)
    }
  }

  const handleOpenChangePassword =
    () => {
      if (!passwordLimit.canChange) {
        return
      }

      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")

      setShowCurrentPassword(false)
      setShowNewPassword(false)
      setShowConfirmPassword(false)

      setPasswordMessage("")
      setPasswordSuccess("")

      setChangePasswordOpen(true)
    }

  const handleCloseChangePassword =
    () => {
      if (changingPassword) {
        return
      }

      setChangePasswordOpen(false)

      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")

      setShowCurrentPassword(false)
      setShowNewPassword(false)
      setShowConfirmPassword(false)

      setPasswordMessage("")
      setPasswordSuccess("")
    }

  const handleToggleCurrentPassword = (
    event: MouseEvent<HTMLButtonElement>
  ) => {
    setShowCurrentPassword(
      (currentValue) =>
        !currentValue
    )

    currentPasswordRef.current?.blur()
    event.currentTarget.blur()
  }

  const handleToggleNewPassword = (
    event: MouseEvent<HTMLButtonElement>
  ) => {
    setShowNewPassword(
      (currentValue) =>
        !currentValue
    )

    newPasswordRef.current?.blur()
    event.currentTarget.blur()
  }

  const handleToggleConfirmPassword = (
    event: MouseEvent<HTMLButtonElement>
  ) => {
    setShowConfirmPassword(
      (currentValue) =>
        !currentValue
    )

    confirmPasswordRef.current?.blur()
    event.currentTarget.blur()
  }

  const handleSavePassword = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()

    if (
      !passwordFormIsComplete ||
      changingPassword ||
      !passwordLimit.canChange
    ) {
      return
    }

    setChangingPassword(true)
    setPasswordMessage("")
    setPasswordSuccess("")

    try {
      const response =
        await fetch(
          "/api/vip/change-password",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              currentPassword,
              newPassword,
            }),
          }
        )

      const result =
        (await response.json()) as
          ChangeResponse

      if (
        !response.ok ||
        !result.success
      ) {
        if (result.nextChangeAt) {
          const nextLimit = {
            canChange: false,
            nextChangeAt:
              result.nextChangeAt,
          }

          setPasswordLimit(
            nextLimit
          )

          onLimitsChange({
            username:
              usernameLimit,

            password:
              nextLimit,
          })
        }

        setPasswordMessage(
          result.error ||
            "No pudimos cambiar tu contraseña. Inténtalo nuevamente."
        )

        return
      }

      const nextLimit = {
        canChange: false,
        nextChangeAt:
          result.nextChangeAt ??
          null,
      }

      setPasswordLimit(
        nextLimit
      )

      onLimitsChange({
        username:
          usernameLimit,

        password:
          nextLimit,
      })

      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")

      setShowCurrentPassword(false)
      setShowNewPassword(false)
      setShowConfirmPassword(false)

      setPasswordSuccess(
        "Contraseña actualizada correctamente."
      )

      window.setTimeout(() => {
        setChangePasswordOpen(false)
        setPasswordSuccess("")
      }, 900)
    } catch {
      setPasswordMessage(
        "No pudimos cambiar tu contraseña. Inténtalo nuevamente."
      )
    } finally {
      setChangingPassword(false)
    }
  }

  const usernameBlockedText =
    usernameLimit.canChange
      ? "Actualiza el nombre que se muestra en tu cuenta."
      : `Podrás volver a cambiarlo el ${formatNextChangeDate(
          usernameLimit.nextChangeAt
        )}.`

  const passwordBlockedText =
    passwordLimit.canChange
      ? "Protege tu cuenta actualizando tu contraseña."
      : `Podrás volver a cambiarla el ${formatNextChangeDate(
          passwordLimit.nextChangeAt
        )}.`

  return createPortal(
    <div
      className={styles.modalLayer}
      onMouseDown={
        handleBackdropClick
      }
    >
      <div
        className={styles.accountModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vip-account-title"
      >
        <button
          type="button"
          className={
            styles.closeButton
          }
          aria-label="Cerrar Mi cuenta"
          onClick={onClose}
        >
          <CloseIcon />
        </button>

        <header
          className={
            styles.modalHeading
          }
        >
          <h2
            id="vip-account-title"
            className={
              styles.modalTitle
            }
          >
            Mi cuenta
          </h2>

          <p
            className={
              styles.modalDescription
            }
          >
            Administra tu información y
            configuración de cuenta.
          </p>
        </header>

        <div
          className={
            styles.profileSummary
          }
        >
          <div
            className={
              styles.profileAvatar
            }
            aria-hidden="true"
          >
            {accountInitial}
          </div>

          <div
            className={
              styles.profileIdentity
            }
          >
            <p
              className={
                styles.profileName
              }
              title={accountName}
            >
              {accountName}
            </p>

            <p
              className={
                styles.profileEmail
              }
              title={accountEmail}
            >
              {accountEmail}
            </p>

            <span
              className={
                styles.activeBadge
              }
            >
              <span
                className={
                  styles.activePoint
                }
                aria-hidden="true"
              />

              VIP Activo
            </span>
          </div>
        </div>

        <div
          className={
            styles.sectionDivider
          }
          aria-hidden="true"
        />

        <section
          className={
            styles.modalSection
          }
        >
          <h3
            className={
              styles.sectionTitle
            }
          >
            Tu membresía
          </h3>

          <div
            className={
              styles.membershipCard
            }
          >
            <div
              className={
                styles.membershipIcon
              }
              aria-hidden="true"
            >
              <CrownIcon />
            </div>

            <div
              className={
                styles.membershipDetails
              }
            >
              <p
                className={
                  styles.membershipName
                }
              >
                Plan VIP
              </p>

              <p
                className={
                  styles.membershipDescription
                }
              >
                Acceso completo a todos los
                beneficios.
              </p>
            </div>

            <div
              className={
                styles.expirationDetails
              }
            >
              <span>Vence el</span>

              <strong>
                {expirationDate}
              </strong>
            </div>
          </div>
        </section>

        <div
          className={
            styles.sectionDivider
          }
          aria-hidden="true"
        />

        <section
          className={
            styles.modalSection
          }
        >
          <h3
            className={
              styles.sectionTitle
            }
          >
            Acciones de cuenta
          </h3>

          <div
            className={
              styles.accountActions
            }
          >
            <button
              type="button"
              className={
                styles.actionButton
              }
              disabled={
                !usernameLimit.canChange
              }
              onClick={
                handleOpenEditName
              }
            >
              <span
                className={
                  styles.actionIcon
                }
                aria-hidden="true"
              >
                <UserIcon />
              </span>

              <span
                className={
                  styles.actionText
                }
              >
                <strong>
                  Editar nombre visible
                </strong>

                <small>
                  {usernameBlockedText}
                </small>
              </span>

              <span
                className={
                  styles.chevronIcon
                }
                aria-hidden="true"
              >
                <ChevronIcon />
              </span>
            </button>

            <button
              type="button"
              className={
                styles.actionButton
              }
              disabled={
                !passwordLimit.canChange
              }
              onClick={
                handleOpenChangePassword
              }
            >
              <span
                className={
                  styles.actionIcon
                }
                aria-hidden="true"
              >
                <LockIcon />
              </span>

              <span
                className={
                  styles.actionText
                }
              >
                <strong>
                  Cambiar contraseña
                </strong>

                <small>
                  {passwordBlockedText}
                </small>
              </span>

              <span
                className={
                  styles.chevronIcon
                }
                aria-hidden="true"
              >
                <ChevronIcon />
              </span>
            </button>
          </div>
        </section>
      </div>

      {editNameOpen && (
        <div
          className={
            styles.secondaryLayer
          }
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              handleCloseEditName()
            }
          }}
        >
          <form
            className={
              styles.secondaryModal
            }
            aria-labelledby="edit-name-title"
            onSubmit={
              handleSaveUsername
            }
            noValidate
          >
            <button
              type="button"
              className={
                styles.secondaryCloseButton
              }
              aria-label="Cerrar edición de nombre"
              disabled={savingUsername}
              onClick={
                handleCloseEditName
              }
            >
              <CloseIcon />
            </button>

            <header
              className={
                styles.secondaryHeading
              }
            >
              <h3
                id="edit-name-title"
                className={
                  styles.secondaryTitle
                }
              >
                Editar nombre visible
              </h3>

              <p
                className={
                  styles.secondaryDescription
                }
              >
                Este será el nombre con el que
                aparecerás en tu cuenta.
              </p>
            </header>

            <label
              className={
                styles.fieldLabel
              }
              htmlFor="vip-edit-username"
            >
              Nombre de usuario
            </label>

            <input
              id="vip-edit-username"
              name="username"
              className={
                styles.nameInput
              }
              type="text"
              value={username}
              placeholder="Usuario"
              minLength={
                MINIMUM_USERNAME_LENGTH
              }
              maxLength={
                MAXIMUM_USERNAME_LENGTH
              }
              autoComplete="off"
              autoCapitalize="words"
              spellCheck="false"
              disabled={savingUsername}
              onKeyDown={
                handleUsernameKeyDown
              }
              onChange={(event) => {
                handleUsernameChange(
                  event.target.value
                )
              }}
            />

            <div
              className={
                styles.fieldInformation
              }
            >
              <span>
                Entre 4 y 10 caracteres
              </span>

              <span>
                {username.length} /{" "}
                {MAXIMUM_USERNAME_LENGTH}
              </span>
            </div>

            {usernameIsReserved && (
              <p
                className={
                  styles.formError
                }
                role="alert"
              >
                Ese nombre está reservado.
                Elige un nombre diferente.
              </p>
            )}

            {usernameMessage && (
              <p
                className={
                  styles.formError
                }
                role="alert"
              >
                {usernameMessage}
              </p>
            )}

            {usernameSuccess && (
              <p
                className={
                  styles.formSuccess
                }
                role="status"
              >
                {usernameSuccess}
              </p>
            )}

            <div
              className={
                styles.secondaryActions
              }
            >
              <button
                type="button"
                className={
                  styles.cancelButton
                }
                disabled={savingUsername}
                onClick={
                  handleCloseEditName
                }
              >
                Cancelar
              </button>

              <button
                type="submit"
                className={
                  styles.saveButton
                }
                disabled={
                  !usernameIsComplete ||
                  savingUsername ||
                  username === accountName
                }
              >
                {savingUsername
                  ? "Guardando..."
                  : "Guardar cambios"}
              </button>
            </div>
          </form>
        </div>
      )}

      {changePasswordOpen && (
        <div
          className={
            styles.secondaryLayer
          }
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              handleCloseChangePassword()
            }
          }}
        >
          <form
            className={`${styles.secondaryModal} ${styles.passwordModal}`}
            aria-labelledby="change-password-title"
            onSubmit={
              handleSavePassword
            }
            noValidate
          >
            <button
              type="button"
              className={
                styles.secondaryCloseButton
              }
              aria-label="Cerrar cambio de contraseña"
              disabled={changingPassword}
              onClick={
                handleCloseChangePassword
              }
            >
              <CloseIcon />
            </button>

            <header
              className={
                styles.secondaryHeading
              }
            >
              <h3
                id="change-password-title"
                className={
                  styles.secondaryTitle
                }
              >
                Cambiar contraseña
              </h3>

              <p
                className={
                  styles.secondaryDescription
                }
              >
                Confirma tu contraseña actual
                y elige una nueva.
              </p>
            </header>

            <div
              className={
                styles.passwordFields
              }
            >
              <div
                className={
                  styles.passwordFieldGroup
                }
              >
                <label
                  className={
                    styles.fieldLabel
                  }
                  htmlFor="vip-current-password"
                >
                  Contraseña actual
                </label>

                <div
                  className={
                    styles.passwordInputShell
                  }
                >
                  <input
                    ref={
                      currentPasswordRef
                    }
                    id="vip-current-password"
                    className={
                      styles.passwordInput
                    }
                    type={
                      showCurrentPassword
                        ? "text"
                        : "password"
                    }
                    value={
                      currentPassword
                    }
                    placeholder="Contraseña actual"
                    autoComplete="current-password"
                    disabled={
                      changingPassword
                    }
                    onChange={(event) => {
                      setCurrentPassword(
                        event.target.value
                      )

                      clearPasswordMessages()
                    }}
                  />

                  <button
                    type="button"
                    tabIndex={-1}
                    className={
                      styles.passwordEyeButton
                    }
                    aria-label={
                      showCurrentPassword
                        ? "Ocultar contraseña actual"
                        : "Mostrar contraseña actual"
                    }
                    disabled={
                      changingPassword
                    }
                    onClick={
                      handleToggleCurrentPassword
                    }
                  >
                    {showCurrentPassword
                      ? (
                        <EyeIcon />
                      )
                      : (
                        <EyeOffIcon />
                      )}
                  </button>
                </div>
              </div>

              <div
                className={
                  styles.passwordFieldGroup
                }
              >
                <label
                  className={
                    styles.fieldLabel
                  }
                  htmlFor="vip-new-password"
                >
                  Nueva contraseña
                </label>

                <div
                  className={
                    styles.passwordInputShell
                  }
                >
                  <input
                    ref={
                      newPasswordRef
                    }
                    id="vip-new-password"
                    className={
                      styles.passwordInput
                    }
                    type={
                      showNewPassword
                        ? "text"
                        : "password"
                    }
                    value={newPassword}
                    placeholder="Nueva contraseña"
                    minLength={
                      MINIMUM_PASSWORD_LENGTH
                    }
                    maxLength={
                      MAXIMUM_PASSWORD_LENGTH
                    }
                    autoComplete="new-password"
                    disabled={
                      changingPassword
                    }
                    onChange={(event) => {
                      setNewPassword(
                        event.target.value
                      )

                      clearPasswordMessages()
                    }}
                  />

                  <button
                    type="button"
                    tabIndex={-1}
                    className={
                      styles.passwordEyeButton
                    }
                    aria-label={
                      showNewPassword
                        ? "Ocultar nueva contraseña"
                        : "Mostrar nueva contraseña"
                    }
                    disabled={
                      changingPassword
                    }
                    onClick={
                      handleToggleNewPassword
                    }
                  >
                    {showNewPassword
                      ? (
                        <EyeIcon />
                      )
                      : (
                        <EyeOffIcon />
                      )}
                  </button>
                </div>

                <div
                  className={
                    styles.fieldInformation
                  }
                >
                  <span>
                    Entre 12 y 24 caracteres
                  </span>

                  <span>
                    {newPassword.length} /{" "}
                    {MAXIMUM_PASSWORD_LENGTH}
                  </span>
                </div>
              </div>

              <div
                className={
                  styles.passwordFieldGroup
                }
              >
                <label
                  className={
                    styles.fieldLabel
                  }
                  htmlFor="vip-confirm-password"
                >
                  Confirmar contraseña
                </label>

                <div
                  className={
                    styles.passwordInputShell
                  }
                >
                  <input
                    ref={
                      confirmPasswordRef
                    }
                    id="vip-confirm-password"
                    className={
                      styles.passwordInput
                    }
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    value={
                      confirmPassword
                    }
                    placeholder="Repite la nueva contraseña"
                    maxLength={
                      MAXIMUM_PASSWORD_LENGTH
                    }
                    autoComplete="new-password"
                    disabled={
                      changingPassword
                    }
                    onChange={(event) => {
                      setConfirmPassword(
                        event.target.value
                      )

                      clearPasswordMessages()
                    }}
                  />

                  <button
                    type="button"
                    tabIndex={-1}
                    className={
                      styles.passwordEyeButton
                    }
                    aria-label={
                      showConfirmPassword
                        ? "Ocultar confirmación"
                        : "Mostrar confirmación"
                    }
                    disabled={
                      changingPassword
                    }
                    onClick={
                      handleToggleConfirmPassword
                    }
                  >
                    {showConfirmPassword
                      ? (
                        <EyeIcon />
                      )
                      : (
                        <EyeOffIcon />
                      )}
                  </button>
                </div>

                {confirmPassword.length >
                  0 &&
                  !passwordsMatch && (
                    <p
                      className={
                        styles.inlineError
                      }
                    >
                      Las contraseñas no
                      coinciden.
                    </p>
                  )}

                {newPassword.length > 0 &&
                  currentPassword.length >
                    0 &&
                  !newPasswordIsDifferent && (
                    <p
                      className={
                        styles.inlineError
                      }
                    >
                      La nueva contraseña debe
                      ser diferente a la actual.
                    </p>
                  )}
              </div>
            </div>

            {passwordMessage && (
              <p
                className={
                  styles.formError
                }
                role="alert"
              >
                {passwordMessage}
              </p>
            )}

            {passwordSuccess && (
              <p
                className={
                  styles.formSuccess
                }
                role="status"
              >
                {passwordSuccess}
              </p>
            )}

            <div
              className={
                styles.secondaryActions
              }
            >
              <button
                type="button"
                className={
                  styles.cancelButton
                }
                disabled={
                  changingPassword
                }
                onClick={
                  handleCloseChangePassword
                }
              >
                Cancelar
              </button>

              <button
                type="submit"
                className={
                  styles.saveButton
                }
                disabled={
                  !passwordFormIsComplete ||
                  changingPassword
                }
              >
                {changingPassword
                  ? "Actualizando..."
                  : "Cambiar contraseña"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>,
    document.body
  )
}