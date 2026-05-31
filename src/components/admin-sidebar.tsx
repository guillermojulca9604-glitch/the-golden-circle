"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const links = [
  { href: "/admin/proofs", label: "Solicitudes" },
  { href: "/admin/activated", label: "Activados" },
  { href: "/admin/disabled", label: "Desactivados" },
  { href: "/admin/trash", label: "Papelera" },
  { href: "/admin/content", label: "Contenido" },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-header">
        <span>The Golden Circle</span>
      </div>

      <nav className="admin-sidebar-nav">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`admin-sidebar-link ${
              pathname === link.href ? "active" : ""
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}