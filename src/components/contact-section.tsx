import Image from "next/image"

const contactInfo = {
  telegramUsername: "@TGoldenCircle",
  telegramLink: "https://t.me/TGoldenCircle",
  description:
    "Más información y novedades disponibles mediante Telegram.",
  qrCodeUrl:
    "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=https://t.me/TGoldenCircle&bgcolor=050503&color=d4af37&format=png",
}

export function ContactSection() {
  return (
    <section className="relative overflow-hidden px-6 py-10 md:py-14">
      <div className="mx-auto mb-8 max-w-5xl text-center">
        <span className="mb-4 block text-xs uppercase tracking-[0.4em] text-gold">
          Contacto
        </span>

        <h2 className="mb-6 text-3xl font-light tracking-wide text-foreground md:text-4xl lg:text-5xl">
          Únete al Círculo
        </h2>

        <div className="gold-line" />
      </div>

      <div className="featured-card mx-auto max-w-3xl overflow-hidden rounded-3xl bg-black px-6 py-8 text-center md:px-10 md:py-10">
        <div className="mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-full border border-gold/20 bg-black text-3xl text-gold">
          ✦
        </div>

        <div className="mx-auto mb-6 w-fit rounded-3xl border border-gold/15 bg-black p-5">
          <Image
            src={contactInfo.qrCodeUrl}
            alt="Telegram QR Code"
            width={220}
            height={220}
            className="rounded-xl"
          />
        </div>

        <p className="mb-6 text-xs tracking-[0.3em] text-muted-foreground">
          Escanea para unirte
        </p>

        <a
          href={contactInfo.telegramLink}
          target="_blank"
          rel="noopener noreferrer"
          className="telegram-button mb-6 inline-flex items-center gap-4 rounded-2xl px-8 py-4 text-lg"
        >
          <span>◈</span>
          <span>{contactInfo.telegramUsername}</span>
          <span className="telegram-arrow">➜</span>
        </a>

        <p className="mx-auto mb-10 max-w-2xl leading-relaxed text-muted-foreground">
          {contactInfo.description}
        </p>

        <div className="gold-line" />
      </div>
    </section>
  )
}