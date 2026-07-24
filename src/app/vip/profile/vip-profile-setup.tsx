"use client"

import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import { useRouter } from "next/navigation"

import vipStyles from "../vip.module.css"
import styles from "./vip-profile.module.css"

const MINIMUM_USERNAME_LENGTH = 4
const MAXIMUM_USERNAME_LENGTH = 10

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

const breathingPoints = [
  vipStyles.vipPointOne,
  vipStyles.vipPointTwo,
  vipStyles.vipPointThree,
  vipStyles.vipPointFour,
  vipStyles.vipPointFive,
  vipStyles.vipPointSix,
  vipStyles.vipPointSeven,
  vipStyles.vipPointEight,
  vipStyles.vipPointNine,
  vipStyles.vipPointTen,
  vipStyles.vipPointEleven,
  vipStyles.vipPointTwelve,
  vipStyles.vipPointThirteen,
  vipStyles.vipPointFourteen,
  vipStyles.vipPointFifteen,
  vipStyles.vipPointSixteen,
  vipStyles.vipPointSeventeen,
  vipStyles.vipPointEighteen,
  vipStyles.vipPointNineteen,
  vipStyles.vipPointTwenty,
]

type CreateProfileResponse = {
  success?: boolean
  username?: string
  error?: string
}

function ProfileIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="7.5"
        r="3.25"
        stroke="currentColor"
        strokeWidth="1.35"
      />

      <path
        d="M5.6 19c.5-3.45 2.65-5.25 6.4-5.25s5.9 1.8 6.4 5.25"
        stroke="currentColor"
        strokeWidth="1.35"
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
        x="6.5"
        y="10.2"
        width="11"
        height="9.1"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.35"
      />

      <path
        d="M9 10.2V7.7a3 3 0 0 1 6 0v2.5"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </svg>
  )
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

export function VipProfileSetup() {
  const router = useRouter()

  const visualSceneRef =
    useRef<HTMLDivElement>(null)

  const [
    username,
    setUsername,
  ] = useState("")

  const [
    submitting,
    setSubmitting,
  ] = useState(false)

  const [
    message,
    setMessage,
  ] = useState("")

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

  useEffect(() => {
    const initialPixelRatio =
      window.devicePixelRatio ||
      1

    let animationFrame = 0

    const updatePointSizes = () => {
      window.cancelAnimationFrame(
        animationFrame
      )

      animationFrame =
        window.requestAnimationFrame(
          () => {
            const visualScene =
              visualSceneRef.current

            if (!visualScene) {
              return
            }

            const currentPixelRatio =
              window.devicePixelRatio ||
              initialPixelRatio

            const rawCompensation =
              initialPixelRatio /
              currentPixelRatio

            const compensation =
              Math.min(
                2.5,
                Math.max(
                  0.4,
                  rawCompensation
                )
              )

            const setSize = (
              property: string,
              baseSize: number
            ) => {
              visualScene.style
                .setProperty(
                  property,
                  `${
                    baseSize *
                    compensation
                  }px`
                )
            }

            setSize(
              "--vip-point-size",
              1
            )

            setSize(
              "--vip-point-size-small",
              0.9
            )

            setSize(
              "--vip-point-size-large",
              1.1
            )

            setSize(
              "--vip-point-glow-one",
              1
            )

            setSize(
              "--vip-point-glow-two",
              3
            )

            setSize(
              "--vip-point-glow-three",
              7
            )

            setSize(
              "--vip-point-rest-glow-one",
              1
            )

            setSize(
              "--vip-point-rest-glow-two",
              2
            )

            setSize(
              "--vip-point-rest-glow-three",
              4
            )

            setSize(
              "--vip-point-peak-glow-one",
              2
            )

            setSize(
              "--vip-point-peak-glow-two",
              5
            )

            setSize(
              "--vip-point-peak-glow-three",
              10
            )
          }
        )
    }

    updatePointSizes()

    window.addEventListener(
      "resize",
      updatePointSizes
    )

    window.visualViewport
      ?.addEventListener(
        "resize",
        updatePointSizes
      )

    return () => {
      window.cancelAnimationFrame(
        animationFrame
      )

      window.removeEventListener(
        "resize",
        updatePointSizes
      )

      window.visualViewport
        ?.removeEventListener(
          "resize",
          updatePointSizes
        )
    }
  }, [])

  const handleUsernameChange = (
    value: string
  ) => {
    setUsername(
      sanitizeUsername(value)
    )

    if (message) {
      setMessage("")
    }
  }

  const handleUsernameKeyDown = (
    event:
      KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === " ") {
      event.preventDefault()
    }
  }

  const handleSubmit = async (
    event:
      FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()

    if (
      !usernameIsComplete ||
      submitting
    ) {
      return
    }

    setSubmitting(true)
    setMessage("")

    try {
      const response =
        await fetch(
          "/api/vip/create-profile",
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
          CreateProfileResponse

      if (
        !response.ok ||
        !result.success
      ) {
        setSubmitting(false)

        setMessage(
          result.error ||
            "No pudimos guardar tu nombre. Inténtalo nuevamente."
        )

        return
      }

      router.replace("/vip")
      router.refresh()
    } catch {
      setSubmitting(false)

      setMessage(
        "No pudimos guardar tu nombre. Inténtalo nuevamente."
      )
    }
  }

  return (
    <main
      className={
        vipStyles.vipPage
      }
    >
      <div
        ref={visualSceneRef}
        className={
          vipStyles.vipVisualScene
        }
        aria-hidden="true"
      >
        <div
          className={
            vipStyles.vipBackgroundLayer
          }
        />

        <div
          className={
            vipStyles.vipAtmosphereLayer
          }
        >
          <div
            className={
              vipStyles.vipSky
            }
          >
            <div
              className={
                vipStyles.vipBreathGlow
              }
            />

            {breathingPoints.map(
              (
                positionClass,
                index
              ) => (
                <span
                  key={index}
                  className={`${vipStyles.vipBreathingPoint} ${positionClass}`}
                />
              )
            )}
          </div>
        </div>
      </div>

      <div
        className={
          vipStyles.vipContent
        }
      >
        <div
          className={
            styles.profileViewport
          }
        >
          <section
            className={
              styles.profileCard
            }
            aria-labelledby="profile-title"
          >
            <div
              className={
                styles.profileEmblem
              }
              aria-hidden="true"
            >
              <ProfileIcon />
            </div>

            <header
              className={
                styles.heading
              }
            >
              <p
                className={
                  styles.welcome
                }
              >
                Bienvenido a
              </p>

              <h1
                id="profile-title"
                className={
                  styles.title
                }
              >
                THE GOLDEN CIRCLE
              </h1>

              <div
                className={
                  styles.titleDivider
                }
                aria-hidden="true"
              >
                <span />
              </div>

              <p
                className={
                  styles.description
                }
              >
                Antes de continuar, elige
                el nombre con el que deseas
                aparecer.
              </p>
            </header>

            <form
              className={
                styles.form
              }
              onSubmit={
                handleSubmit
              }
              noValidate
            >
              <div
                className={
                  styles.fieldGroup
                }
              >
                <label
                  className={
                    styles.label
                  }
                  htmlFor="vip-profile-name"
                >
                  Nombre de usuario
                </label>

                <div
                  className={`${styles.inputShell} ${
                    usernameIsComplete
                      ? styles.inputShellComplete
                      : ""
                  }`}
                >
                  <span
                    className={
                      styles.inputIcon
                    }
                    aria-hidden="true"
                  >
                    <ProfileIcon />
                  </span>

                  <input
                    id="vip-profile-name"
                    name="username"
                    className={
                      styles.input
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
                    disabled={
                      submitting
                    }
                    onKeyDown={
                      handleUsernameKeyDown
                    }
                    onChange={(
                      event
                    ) => {
                      handleUsernameChange(
                        event.target
                          .value
                      )
                    }}
                  />
                </div>

                <div
                  className={
                    styles.fieldFooter
                  }
                >
                  <p
                    className={
                      styles.fieldHelp
                    }
                  >
                    Entre 4 y 10
                    caracteres
                  </p>

                  <p
                    className={
                      styles.characterCount
                    }
                    aria-live="polite"
                  >
                    {username.length} /{" "}
                    {
                      MAXIMUM_USERNAME_LENGTH
                    }
                  </p>
                </div>
              </div>

              {usernameIsReserved && (
                <p
                  className={
                    styles.errorMessage
                  }
                  role="alert"
                >
                  Ese nombre está
                  reservado. Elige un
                  nombre diferente.
                </p>
              )}

              {message && (
                <p
                  className={
                    styles.errorMessage
                  }
                  role="alert"
                >
                  {message}
                </p>
              )}

              <button
                type="submit"
                className={
                  styles.continueButton
                }
                disabled={
                  !usernameIsComplete ||
                  submitting
                }
              >
                {submitting
                  ? "Preparando tu acceso..."
                  : "Continuar"}
              </button>

              <p
                className={
                  styles.buttonHelp
                }
              >
                <span
                  className={
                    styles.lockIcon
                  }
                  aria-hidden="true"
                >
                  <LockIcon />
                </span>

                Completa tu nombre de
                usuario para continuar.
              </p>
            </form>
          </section>
        </div>
      </div>
    </main>
  )
}