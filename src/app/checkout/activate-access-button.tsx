"use client"

type Props = {
  plan: "monthly" | "quarterly"
}

const PAYMENT_TTL = 1000 * 60 * 20

export function ActivateAccessButton({ plan }: Props) {
  const storageKey = `tgc_pending_payment_${plan}`

  const handleClick = async () => {
    const saved = sessionStorage.getItem(storageKey)

    if (saved) {
      try {
        const parsed = JSON.parse(saved) as {
          url: string
          createdAt: number
        }

        if (parsed.url && Date.now() - parsed.createdAt < PAYMENT_TTL) {
          window.location.href = parsed.url
          return
        }

        sessionStorage.removeItem(storageKey)
      } catch {
        sessionStorage.removeItem(storageKey)
      }
    }

    const response = await fetch("/api/mercadopago/create-preference", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ plan }),
    })

    if (response.status === 401) {
      window.location.href = `/login?next=/checkout?plan=${plan}&country=pe`
      return
    }

    const data = await response.json()

    if (data?.url === "/vip") {
      sessionStorage.removeItem(storageKey)
      window.location.href = "/vip"
      return
    }

    if (data?.url) {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          url: data.url,
          createdAt: Date.now(),
        })
      )

      window.location.href = data.url
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="telegram-button subscription-premium-button flex w-full items-center justify-center rounded-2xl px-6 py-4 text-xs uppercase tracking-[0.25em] transition duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97]"
    >
      Activar acceso
    </button>
  )
}