function GoldenLogo() {
  return (
    <div className="hero-logo">
      <div className="hero-logo-ring hero-logo-ring-1" />
      <div className="hero-logo-ring hero-logo-ring-2" />
      <div className="hero-logo-ring hero-logo-ring-3" />
      <span className="hero-logo-letter">G</span>
    </div>
  )
}

function GlowLetters({ text }: { text: string }) {
  return (
    <>
      {text.split("").map((letter, index) => (
        <span
          key={`${letter}-${index}`}
          className="hero-letter"
        >
          {letter}
        </span>
      ))}
    </>
  )
}

export function HeroSection() {
  return (
    <section className="hero-section relative flex items-center justify-center overflow-hidden text-center">
      <div className="hero-waves absolute inset-0" />
      <div className="hero-vignette absolute inset-0" />

      <div className="hero-login-wrap absolute right-6 top-6 z-30 md:right-10 md:top-8">
        <a
          href="/access?step=login&from=home"
          className="hero-login-button"
        >
          <span>Iniciar sesión</span>
        </a>
      </div>

      <div className="hero-title-zone relative z-10 mx-auto w-full max-w-6xl">
        <GoldenLogo />

        <p className="hero-the">
          <GlowLetters text="THE" />
        </p>

        <h1 className="hero-title">
          <span className="hero-word">
            <GlowLetters text="GOLDEN" />
          </span>

          <br />

          <span className="hero-word">
            <GlowLetters text="CIRCLE" />
          </span>
        </h1>

        <div className="gold-line hero-line" />

        <p className="hero-subtitle">
          Página oficial de información, novedades y contacto
        </p>
      </div>
    </section>
  )
}