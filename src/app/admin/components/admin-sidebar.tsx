"use client"

import Link from "next/link"

import {
  usePathname,
} from "next/navigation"

import {
  type ComponentType,
  type MouseEvent,
  type SVGProps,
  useEffect,
  useState,
} from "react"

import styles from "./admin-sidebar.module.css"

type IconProps =
  SVGProps<SVGSVGElement>

type NavigationItem = {
  href: string
  label: string
  Icon:
    ComponentType<IconProps>
}

function SummaryIcon(
  props: IconProps
) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
    >
      <rect
        x="4"
        y="4"
        width="6"
        height="6"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.7"
      />

      <rect
        x="14"
        y="4"
        width="6"
        height="10"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.7"
      />

      <rect
        x="4"
        y="14"
        width="6"
        height="6"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.7"
      />

      <rect
        x="14"
        y="18"
        width="6"
        height="2"
        rx="1"
        fill="currentColor"
      />
    </svg>
  )
}

function PaymentsIcon(
  props: IconProps
) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
    >
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.7"
      />

      <path
        d="M3 9h18"
        stroke="currentColor"
        strokeWidth="1.7"
      />

      <path
        d="M7 15h4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

function MembershipsIcon(
  props: IconProps
) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
    >
      <circle
        cx="9"
        cy="8"
        r="4"
        stroke="currentColor"
        strokeWidth="1.7"
      />

      <path
        d="M3 20v-1.5A3.5 3.5 0 0 1 6.5 15h5a3.5 3.5 0 0 1 3.5 3.5V20"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />

      <path
        d="m16 11 1.8 1.8L22 8.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ExpiredIcon(
  props: IconProps
) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="1.7"
      />

      <path
        d="M12 7v5l3 2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M5.6 18.4 18.4 5.6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

function DeletedIcon(
  props: IconProps
) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
    >
      <path
        d="M4 7h16"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />

      <path
        d="M9 7V4h6v3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="m6 7 1 13h10l1-13"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />

      <path
        d="M10 11v5M14 11v5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

function SidebarPanelIcon(
  props: IconProps
) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
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

const navigationItems:
  NavigationItem[] = [
    {
      href: "/admin",
      label: "Resumen",
      Icon: SummaryIcon,
    },
    {
      href: "/admin/approved",
      label: "Pagos aprobados",
      Icon: PaymentsIcon,
    },
    {
      href: "/admin/activated",
      label: "Membresías activas",
      Icon: MembershipsIcon,
    },
    {
      href: "/admin/disabled",
      label: "VIP vencidos",
      Icon: ExpiredIcon,
    },
    {
      href: "/admin/trash",
      label: "Papelera",
      Icon: DeletedIcon,
    },
  ]

function routeIsActive(
  pathname: string,
  href: string
) {
  if (href === "/admin") {
    return pathname ===
      "/admin"
  }

  return (
    pathname === href ||
    pathname.startsWith(
      `${href}/`
    )
  )
}

export function AdminSidebar() {
  const pathname =
    usePathname()

  const [
    collapsed,
    setCollapsed,
  ] =
    useState(false)

  useEffect(() => {
    const mobileQuery =
      window.matchMedia(
        "(max-width: 767px)"
      )

    if (
      mobileQuery.matches
    ) {
      setCollapsed(true)
    }
  }, [])

  useEffect(() => {
    document.documentElement
      .style
      .setProperty(
        "--admin-sidebar-width",
        collapsed
          ? "60px"
          : "220px"
      )

    return () => {
      document.documentElement
        .style
        .removeProperty(
          "--admin-sidebar-width"
        )
    }
  }, [collapsed])

  const handleBrandClick = (
    event:
      MouseEvent<HTMLButtonElement>
  ) => {
    if (!collapsed) {
      event.preventDefault()
      return
    }

    setCollapsed(false)
  }

  const handleNavigation =
    () => {
      const isMobile =
        window.matchMedia(
          "(max-width: 767px)"
        ).matches

      if (isMobile) {
        setCollapsed(true)
      }
    }

  return (
    <aside
      aria-label="Navegación administrativa"
      className={`${styles.sidebar} ${
        collapsed
          ? styles.sidebarCollapsed
          : ""
      }`}
    >
      <header
        className={
          styles.sidebarHeader
        }
      >
        <div
          className={
            styles.brand
          }
        >
          <button
            type="button"
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
            tabIndex={
              collapsed ? 0 : -1
            }
            onClick={
              handleBrandClick
            }
            className={
              styles.brandButton
            }
          >
            <span
              aria-hidden="true"
              className={
                styles.brandRing
              }
            />

            <span
              aria-hidden="true"
              className={
                styles.brandExpandIcon
              }
            >
              <SidebarPanelIcon
                className={
                  styles.brandPanelIcon
                }
              />
            </span>
          </button>

          <p
            aria-hidden={
              collapsed
            }
            className={
              styles.brandName
            }
          >
            <span>THE</span>
            <span>GOLDEN</span>
            <span>CIRCLE</span>
          </p>
        </div>

        <button
          type="button"
          aria-label="Retraer barra lateral"
          tabIndex={
            collapsed ? -1 : 0
          }
          disabled={
            collapsed
          }
          onClick={() => {
            setCollapsed(true)
          }}
          className={
            styles.collapseButton
          }
        >
          <SidebarPanelIcon
            className={
              styles.panelIcon
            }
          />
        </button>
      </header>

      <nav
        aria-label="Secciones administrativas"
        className={
          styles.navigation
        }
      >
        {navigationItems.map(
          ({
            href,
            label,
            Icon,
          }) => {
            const isActive =
              routeIsActive(
                pathname,
                href
              )

            return (
              <Link
                key={href}
                href={href}
                aria-current={
                  isActive
                    ? "page"
                    : undefined
                }
                aria-label={
                  collapsed
                    ? label
                    : undefined
                }
                title={
                  collapsed
                    ? label
                    : undefined
                }
                onClick={
                  handleNavigation
                }
                className={`${styles.navigationItem} ${
                  isActive
                    ? styles.navigationItemActive
                    : ""
                }`}
              >
                <Icon
                  className={
                    styles.navigationIcon
                  }
                />

                <span
                  className={
                    styles.navigationText
                  }
                >
                  <span
                    className={
                      styles.navigationLabel
                    }
                  >
                    {label}
                  </span>
                </span>
              </Link>
            )
          }
        )}
      </nav>
    </aside>
  )
}