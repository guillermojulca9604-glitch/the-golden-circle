const token = process.env.TELEGRAM_BOT_TOKEN

console.log("Buscando canal de Telegram...")

if (!token) {
  console.error("❌ No encontré TELEGRAM_BOT_TOKEN en .env.local")
  process.exit(1)
}

const response = await fetch(
  `https://api.telegram.org/bot${token}/getUpdates`
)

const data = await response.json()

if (!data.ok) {
  console.error("❌ Telegram respondió con error:")
  console.error(data)
  process.exit(1)
}

console.log("Updates recibidos:", data.result.length)

let encontrado = false

for (const update of data.result) {
  const chat =
    update.channel_post?.chat ??
    update.my_chat_member?.chat ??
    update.chat_member?.chat

  if (chat?.type === "channel") {
    encontrado = true

    console.log("")
    console.log("✅ CANAL ENCONTRADO")
    console.log("Nombre:", chat.title)
    console.log("ID:", chat.id)
    console.log("Tipo:", chat.type)
  }
}

if (!encontrado) {
  console.log("")
  console.log("⚠️ No encontré el canal todavía.")
  console.log(
    'Publica un mensaje que diga "setup" en The Golden Circle y vuelve a ejecutar el comando.'
  )
}