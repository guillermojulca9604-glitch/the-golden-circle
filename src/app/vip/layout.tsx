import type { ReactNode } from "react"
import { SessionGuard } from "@/components/session-guard"

export default function VipLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <>
      <SessionGuard mode="vip" />
      {children}
    </>
  )
}