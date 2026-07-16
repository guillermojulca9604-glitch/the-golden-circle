import type { ReactNode } from "react"
import { SessionGuard } from "@/components/session-guard"

export default function AdminLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <>
      <SessionGuard mode="signed-in" />
      {children}
    </>
  )
}