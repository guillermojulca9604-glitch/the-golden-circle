import type {
  ReactNode,
} from "react"

import {
  AdminAccountMenu,
} from "./components/admin-account-menu"
import {
  AdminSidebar,
} from "./components/admin-sidebar"

import {
  requireAdmin,
} from "@/lib/auth/require-admin"

type AdminLayoutProps = {
  children: ReactNode
}

export default async function AdminLayout({
  children,
}: AdminLayoutProps) {
  const admin =
    await requireAdmin()

  return (
    <div className="admin-shell min-h-screen bg-black text-foreground">
      <style>
        {`
          .admin-shell {
            --admin-header-top:
              1.25rem;
          }

          @media (
            min-width: 640px
          ) {
            .admin-shell {
              --admin-header-top:
                1.5rem;
            }
          }

          @media (
            min-width: 1024px
          ) {
            .admin-shell {
              --admin-header-top:
                1.75rem;
            }
          }

          .admin-account-content,
          .admin-content {
            font-family:
              Arial,
              Helvetica,
              sans-serif;

            font-weight: 400;
          }

          .admin-account-content .font-serif,
          .admin-content .font-serif {
            font-family:
              Arial,
              Helvetica,
              sans-serif
              !important;

            font-weight:
              500
              !important;

            letter-spacing:
              -0.025em
              !important;
          }

          .admin-account-content .font-semibold,
          .admin-content .font-semibold {
            font-weight:
              500
              !important;
          }

          .admin-account-content .font-medium,
          .admin-content .font-medium {
            font-weight:
              400
              !important;
          }

          /*
           * ALINEACIÓN SUPERIOR GLOBAL
           *
           * El contenido de cada apartado y
           * el botón de Cuenta comienzan en
           * exactamente la misma coordenada.
           */
          .admin-account-content
          > div:first-child {
            top:
              var(
                --admin-header-top
              )
              !important;
          }

          /*
           * Elimina cualquier desplazamiento
           * adicional aplicado anteriormente
           * al primer encabezado.
           */
          .admin-content
          > div
          > section:first-child {
            margin-top:
              0
              !important;
          }

          /*
           * La línea del título utiliza la misma
           * altura que los botones superiores.
           */
          .admin-content
          > div
          > section:first-child
          h1 {
            line-height:
              2.75rem
              !important;
          }

          /*
           * En páginas con una acción superior,
           * como Añadir video, la acción queda
           * alineada con el título y no centrada
           * entre título y descripción.
           */
          .admin-content
          > div
          > section:first-child
          > div:first-child {
            align-items:
              flex-start
              !important;
          }

          /*
           * FILTROS DE VIDEOS Y PAPELERA
           *
           * Fondo negro permanente.
           * Texto gris permanente.
           * Nada se vuelve amarillo.
           */
          .admin-content
          nav[aria-label^="Filtros"]
          a {
            column-gap:
              1rem;

            border-color:
              rgba(
                214,
                143,
                29,
                0.18
              )
              !important;

            background:
              #000
              !important;

            background-color:
              #000
              !important;

            background-image:
              none
              !important;

            color:
              rgba(
                196,
                193,
                186,
                0.72
              )
              !important;

            box-shadow:
              none
              !important;

            transition:
              color 160ms ease,
              border-color 160ms ease,
              box-shadow 160ms ease;
          }

          /*
           * Hover:
           *
           * El borde se ilumina en dorado.
           * Las letras solo se aclaran.
           * No se vuelven amarillas.
           */
          .admin-content
          nav[aria-label^="Filtros"]
          a:hover,
          .admin-content
          nav[aria-label^="Filtros"]
          a:focus-visible {
            border-color:
              rgba(
                214,
                143,
                29,
                0.78
              )
              !important;

            background:
              #000
              !important;

            background-color:
              #000
              !important;

            background-image:
              none
              !important;

            color:
              rgba(
                242,
                239,
                232,
                0.94
              )
              !important;

            box-shadow:
              0 0 0 1px
                rgba(
                  214,
                  143,
                  29,
                  0.045
                ),
              0 0 14px
                rgba(
                  214,
                  143,
                  29,
                  0.13
                )
              !important;

            outline:
              none;
          }

          /*
           * Seleccionado:
           *
           * Conserva exactamente el aspecto
           * del hover:
           * borde dorado iluminado,
           * letras claras y fondo negro.
           */
          .admin-content
          nav[aria-label^="Filtros"]
          a[aria-current="page"] {
            border-color:
              rgba(
                214,
                143,
                29,
                0.78
              )
              !important;

            background:
              #000
              !important;

            background-color:
              #000
              !important;

            background-image:
              none
              !important;

            color:
              rgba(
                242,
                239,
                232,
                0.94
              )
              !important;

            box-shadow:
              0 0 0 1px
                rgba(
                  214,
                  143,
                  29,
                  0.045
                ),
              0 0 14px
                rgba(
                  214,
                  143,
                  29,
                  0.13
                )
              !important;
          }

          /*
           * Al pasar nuevamente por el
           * seleccionado solo aumenta un poco
           * el brillo del borde.
           */
          .admin-content
          nav[aria-label^="Filtros"]
          a[aria-current="page"]:hover,
          .admin-content
          nav[aria-label^="Filtros"]
          a[aria-current="page"]:focus-visible {
            border-color:
              rgba(
                214,
                143,
                29,
                0.9
              )
              !important;

            background:
              #000
              !important;

            background-color:
              #000
              !important;

            background-image:
              none
              !important;

            color:
              rgba(
                248,
                246,
                240,
                0.98
              )
              !important;

            box-shadow:
              0 0 0 1px
                rgba(
                  214,
                  143,
                  29,
                  0.06
                ),
              0 0 16px
                rgba(
                  214,
                  143,
                  29,
                  0.16
                )
              !important;

            outline:
              none;
          }

          /*
           * Números de los filtros.
           *
           * Sin círculo.
           * Sin borde.
           * Sin fondo.
           * Sin amarillo.
           */
          .admin-content
          nav[aria-label^="Filtros"]
          a > span {
            min-width:
              1ch
              !important;

            padding:
              0
              !important;

            border:
              0
              !important;

            border-radius:
              0
              !important;

            background:
              transparent
              !important;

            background-color:
              transparent
              !important;

            color:
              inherit
              !important;

            font-family:
              inherit
              !important;

            font-size:
              0.86em
              !important;

            font-weight:
              400
              !important;

            font-style:
              normal
              !important;

            font-variant-numeric:
              tabular-nums;

            letter-spacing:
              0
              !important;

            line-height:
              1
              !important;

            opacity:
              0.76;
          }

          /*
           * Cantidades junto a títulos
           * internos de Papelera.
           */
          .admin-content
          h2 + .tabular-nums {
            margin-left:
              0.25rem;

            font-family:
              inherit
              !important;

            font-weight:
              400
              !important;

            letter-spacing:
              0
              !important;

            opacity:
              0.72;
          }
        `}
      </style>

      <AdminSidebar />

      <div className="admin-account-content">
        <AdminAccountMenu
          accountName={
            admin.displayName
          }
          accountEmail={
            admin.email ?? ""
          }
        />
      </div>

      <div
        className="min-h-screen min-w-0 bg-black transition-[margin-left] duration-300 ease-out"
        style={{
          marginLeft:
            "var(--admin-sidebar-width, 220px)",
        }}
      >
        <main
          className="admin-content min-h-screen bg-black px-4 pb-8 sm:px-6 sm:pb-10 lg:px-8 lg:pb-12"
          style={{
            paddingTop:
              "var(--admin-header-top)",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  )
}