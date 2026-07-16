"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

import { createClient } from "@/lib/supabase/client"
import { logoutToHome } from "@/lib/auth/logout-to-home"

const links = [
  {
    href: "/admin/proofs",
    label: "Solicitudes",
  },
  {
    href: "/admin/activated",
    label: "Activados",
  },
  {
    href: "/admin/disabled",
    label: "Desactivados",
  },
  {
    href: "/admin/trash",
    label: "Papelera",
  },
  {
    href: "/admin/content",
    label: "Contenido",
  },
]

export function AdminSidebar() {
  const pathname =
    usePathname()

  const [supabase] =
    useState(
      () => createClient()
    )

  const [
    loggingOut,
    setLoggingOut,
  ] = useState(false)

  const logout = async () => {
    if (loggingOut) {
      return
    }

    setLoggingOut(true)

    await logoutToHome(
      supabase
    )
  }

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-header">
        <span>
          The Golden Circle
        </span>
      </div>

      <nav className="admin-sidebar-nav">
        {links.map(
          (link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`admin-sidebar-link ${
                pathname ===
                link.href
                  ? "active"
                  : ""
              }`}
            >
              {link.label}
            </Link>
          )
        )}
      </nav>

      <button
        type="button"
        onClick={logout}
        disabled={loggingOut}
        className="admin-sidebar-link mt-auto w-full text-left disabled:pointer-events-none disabled:opacity-50"
      >
        {loggingOut
          ? "Cerrando..."
          : "Cerrar sesión"}
      </button>
    </aside>
  )
}