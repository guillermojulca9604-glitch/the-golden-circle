"use client"

import { useEffect, useState } from "react"

import styles from "./vip-sidebar.module.css"

type VipSection =
  | "inicio"
  | "biblioteca"
  | "favoritos"
  | "comunidad"

type IconProps = {
  className?: string
}

function HomeIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M3.7 10.65 12 3.65l8.3 7a.88.88 0 0 1-1.14 1.34l-.5-.42v7.68a1.3 1.3 0 0 1-1.3 1.3h-3.53v-6.02h-3.66v6.02H6.64a1.3 1.3 0 0 1-1.3-1.3v-7.68l-.5.42a.88.88 0 1 1-1.14-1.34Z"
      />
    </svg>
  )
}

function LibraryIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="3.8"
        y="5.3"
        width="16.4"
        height="13.4"
        rx="2.2"
        stroke="currentColor"
        strokeWidth="1.45"
      />

      <path
        d="m10.1 9.15 4.7 2.85-4.7 2.85v-5.7Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function HeartIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M20.2 6.15a4.9 4.9 0 0 0-6.94 0L12 7.4l-1.26-1.25a4.9 4.9 0 1 0-6.94 6.93L12 20.75l8.2-7.67a4.9 4.9 0 0 0 0-6.93Z"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CommunityIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="7.15"
        r="2.4"
        stroke="currentColor"
        strokeWidth="1.3"
      />

      <circle
        cx="6"
        cy="8.9"
        r="1.75"
        stroke="currentColor"
        strokeWidth="1.15"
      />

      <circle
        cx="18"
        cy="8.9"
        r="1.75"
        stroke="currentColor"
        strokeWidth="1.15"
      />

      <path
        d="M7.25 18.75c.44-2.5 2.04-3.95 4.75-3.95s4.31 1.45 4.75 3.95"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />

      <path
        d="M2.45 17.95c.24-1.76 1.39-2.85 3.2-2.85.82 0 1.52.18 2.1.53"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
      />

      <path
        d="M21.55 17.95c-.24-1.76-1.39-2.85-3.2-2.85-.82 0-1.52.18-2.1.53"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
      />
    </svg>
  )
}

function SidebarPanelIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="5"
        width="16"
        height="14"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.35"
      />

      <path
        d="M10 5v14"
        stroke="currentColor"
        strokeWidth="1.35"
      />
    </svg>
  )
}

const navigationItems = [
  {
    id: "inicio" as const,
    label: "Inicio",
    Icon: HomeIcon,
  },
  {
    id: "biblioteca" as const,
    label: "Biblioteca",
    Icon: LibraryIcon,
  },
  {
    id: "favoritos" as const,
    label: "Favoritos",
    Icon: HeartIcon,
  },
  {
    id: "comunidad" as const,
    label: "Comunidad",
    sublabel: "Mis aportes",
    Icon: CommunityIcon,
  },
]

export function VipSidebar() {
  const [collapsed, setCollapsed] = useState(false)

  const [activeSection, setActiveSection] =
    useState<VipSection>("inicio")

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--vip-sidebar-width",
      collapsed ? "60px" : "220px"
    )

    return () => {
      document.documentElement.style.removeProperty(
        "--vip-sidebar-width"
      )
    }
  }, [collapsed])

  const handleBrandClick = () => {
    if (collapsed) {
      setCollapsed(false)
    }
  }

  return (
    <aside
      className={`${styles.sidebar} ${
        collapsed ? styles.sidebarCollapsed : ""
      }`}
      aria-label="Navegación VIP"
    >
      <header className={styles.sidebarHeader}>
        <div className={styles.brand}>
          <button
            type="button"
            className={styles.brandButton}
            aria-label={
              collapsed
                ? "Expandir barra lateral"
                : undefined
            }
            title={
              collapsed
                ? "Expandir barra lateral"
                : undefined
            }
            tabIndex={collapsed ? 0 : -1}
            onClick={handleBrandClick}
          >
            <span
              className={styles.brandRing}
              aria-hidden="true"
            />

            <span
              className={styles.brandExpandIcon}
              aria-hidden="true"
            >
              <SidebarPanelIcon
                className={styles.brandPanelIcon}
              />
            </span>
          </button>

          <p className={styles.brandName}>
            <span>THE</span>
            <span>GOLDEN</span>
            <span>CIRCLE</span>
          </p>
        </div>

        <button
          type="button"
          className={styles.collapseButton}
          aria-label="Retraer barra lateral"
          tabIndex={collapsed ? -1 : 0}
          onClick={() => {
            setCollapsed(true)
          }}
        >
          <SidebarPanelIcon
            className={styles.panelIcon}
          />
        </button>
      </header>

      <nav
        className={styles.navigation}
        aria-label="Secciones VIP"
      >
        {navigationItems.map(
          ({
            id,
            label,
            sublabel,
            Icon,
          }) => {
            const isActive =
              activeSection === id

            return (
              <button
                key={id}
                type="button"
                className={`${styles.navigationItem} ${
                  isActive
                    ? styles.navigationItemActive
                    : ""
                }`}
                aria-current={
                  isActive ? "page" : undefined
                }
                aria-label={
                  collapsed ? label : undefined
                }
                title={
                  collapsed ? label : undefined
                }
                onClick={() => {
                  setActiveSection(id)
                }}
              >
                <Icon
                  className={styles.navigationIcon}
                />

                <span
                  className={styles.navigationText}
                >
                  <span
                    className={styles.navigationLabel}
                  >
                    {label}
                  </span>

                  {sublabel && (
                    <span
                      className={
                        styles.navigationSublabel
                      }
                    >
                      {sublabel}
                    </span>
                  )}
                </span>
              </button>
            )
          }
        )}
      </nav>
    </aside>
  )
}