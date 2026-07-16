import type { Metadata, Viewport } from "next"
import Script from "next/script"
import { Cormorant_Garamond } from "next/font/google"
import "./globals.css"

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-serif",
  display: "block",
})

export const metadata: Metadata = {
  title: "The Golden Circle",
  description:
    "Página oficial de información, novedades y contacto",
}

export const viewport: Viewport = {
  themeColor: "#050503",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body
        className={`${cormorant.variable} font-serif antialiased`}
      >
        <Script
          id="disable-scroll-restoration"
          strategy="beforeInteractive"
        >
          {`
            if ("scrollRestoration" in history) {
              history.scrollRestoration = "manual";
            }

            window.scrollTo(0, 0);
          `}
        </Script>

        {children}
      </body>
    </html>
  )
}