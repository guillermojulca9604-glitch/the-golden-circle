"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

type Props = {
  status: string
}

export function ProofStatusWatcher({ status }: Props) {
  const router = useRouter()

  useEffect(() => {
    if (status !== "pending") return

    const interval = setInterval(() => {
      router.refresh()
    }, 5000)

    return () => clearInterval(interval)
  }, [router, status])

  useEffect(() => {
    if (status === "approved") {
      window.location.href = "/vip"
    }
  }, [status])

  return null
}