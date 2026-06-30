"use client"

type Props = {
  href: string
  className?: string
  children: React.ReactNode
}

export function ReplaceLink({ href, className, children }: Props) {
  return (
    <button
      type="button"
      onClick={() => window.location.replace(href)}
      className={className}
    >
      {children}
    </button>
  )
}