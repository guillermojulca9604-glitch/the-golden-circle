
"use client"

import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"

import { usePathname, useRouter } from "next/navigation"

import { VipAccountMenu } from "./vip-account-menu"
import { VipSidebar } from "./vip-sidebar"
import { VipCommunity } from "./community/vip-community"

import styles from "../vip.module.css"

type VipSection = "inicio" | "comunidad"

type TelegramStatusResponse = {
  ok?: boolean
  linked?: boolean
}

type ChangeLimit = {
  canChange: boolean
  nextChangeAt: string | null
}

type AccountLimits = {
  username: ChangeLimit
  password: ChangeLimit
}

type VipBackgroundProps = {
  accountName: string
  accountEmail: string
  membershipExpiresAt: string
  accountLimits: AccountLimits
  initialHasPassword: boolean
  initialTelegramLinked: boolean
  initialTelegramUsername: string | null
  initialTelegramMaintenance: boolean
  telegramMaintenanceMessage: string
  children: ReactNode
}

const breathingPoints = [
  styles.vipPointOne,
  styles.vipPointTwo,
  styles.vipPointThree,
  styles.vipPointFour,
  styles.vipPointFive,
  styles.vipPointSix,
  styles.vipPointSeven,
  styles.vipPointEight,
  styles.vipPointNine,
  styles.vipPointTen,
  styles.vipPointEleven,
  styles.vipPointTwelve,
  styles.vipPointThirteen,
  styles.vipPointFourteen,
  styles.vipPointFifteen,
  styles.vipPointSixteen,
  styles.vipPointSeventeen,
  styles.vipPointEighteen,
  styles.vipPointNineteen,
  styles.vipPointTwenty,
]

export function VipBackground({
  accountName,
  accountEmail,
  membershipExpiresAt,
  accountLimits,
  initialHasPassword,
  initialTelegramLinked,
  initialTelegramUsername,
  initialTelegramMaintenance,
  telegramMaintenanceMessage,
  children,
}: VipBackgroundProps) {
  const visualSceneRef =
    useRef<HTMLDivElement>(null)

  const pathname = usePathname()
  const router = useRouter()

  const activeSection: VipSection =
    pathname === "/vip/comunidad"
      ? "comunidad"
      : "inicio"

  // Utilizar la vinculación obtenida por la página VIP.
  const [telegramLinked, setTelegramLinked] =
    useState(initialTelegramLinked)

  // Actualizar la vinculación sin mostrar una carga.
  const refreshTelegramStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/telegram/status", {
        method: "GET",
        cache: "no-store",
      })

      if (!response.ok) {
        return
      }

      const result =
        (await response.json()) as TelegramStatusResponse

      if (result.ok === true) {
        setTelegramLinked(result.linked === true)
      }
    } catch {
      // Un error temporal no cambia el estado anterior.
    }
  }, [])

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshTelegramStatus()
      }
    }

    window.addEventListener("focus", refreshIfVisible)
    document.addEventListener(
      "visibilitychange",
      refreshIfVisible
    )

    return () => {
      window.removeEventListener("focus", refreshIfVisible)
      document.removeEventListener(
        "visibilitychange",
        refreshIfVisible
      )
    }
  }, [refreshTelegramStatus])

  // Navegación real de Next.js, sin utilizar #.
  const handleSectionChange = (section: VipSection) => {
    const destination =
      section === "comunidad"
        ? "/vip/comunidad"
        : "/vip"

    if (pathname !== destination) {
      router.push(destination)
    }
  }

  useEffect(() => {
    const initialPixelRatio =
      window.devicePixelRatio || 1

    let animationFrame = 0

    const updatePointSizes = () => {
      window.cancelAnimationFrame(
        animationFrame
      )

      animationFrame =
        window.requestAnimationFrame(() => {
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

          const compensation = Math.min(
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
            visualScene.style.setProperty(
              property,
              `${baseSize * compensation}px`
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
        })
    }

    updatePointSizes()

    window.addEventListener(
      "resize",
      updatePointSizes
    )

    window.visualViewport?.addEventListener(
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

      window.visualViewport?.removeEventListener(
        "resize",
        updatePointSizes
      )
    }
  }, [])

  return (
    <main className={styles.vipPage}>
      <div
        ref={visualSceneRef}
        className={
          styles.vipVisualScene
        }
        aria-hidden="true"
      >
        <div
          className={
            styles.vipBackgroundLayer
          }
        />

        <div
          className={
            styles.vipAtmosphereLayer
          }
        >
          <div className={styles.vipSky}>
            <div
              className={
                styles.vipBreathGlow
              }
            />

            {breathingPoints.map(
              (
                positionClass,
                index
              ) => (
                <span
                  key={index}
                  className={`${styles.vipBreathingPoint} ${positionClass}`}
                />
              )
            )}
          </div>
        </div>
      </div>

      <div className={styles.vipContent}>
        <VipSidebar
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
        />

        {activeSection === "inicio" ? (
          children
        ) : (
          <VipCommunity
            telegramLinked={telegramLinked}
            initialTelegramMaintenance={
              initialTelegramMaintenance
            }
            telegramMaintenanceMessage={
              telegramMaintenanceMessage
            }
          />
        )}

        <VipAccountMenu
          accountName={accountName}
          accountEmail={accountEmail}
          membershipExpiresAt={
            membershipExpiresAt
          }
          initialLimits={
            accountLimits
          }
          initialHasPassword={
            initialHasPassword
          }
          initialTelegramLinked={
            initialTelegramLinked
          }
          initialTelegramUsername={
            initialTelegramUsername
          }
        />

        <h1
          className={
            styles.screenReaderOnly
          }
        >
          Área VIP de The Golden Circle
        </h1>
      </div>
    </main>
  )
}
