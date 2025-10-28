const express = require("express");
const axios = require("axios");
const path = require("path");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

// =================== CONFIG ===================
const BOT_TOKEN = "8366510657:AAEC5for6-8246aKdW6F5w3FPfJ5oWNLCfA";
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const WEBHOOK_DOMAIN = "https://team-battle-v-bot.onrender.com"; // 👈 עודכן ל-Render
const MINI_APP_URL = "https://team-battle-v-bot.onrender.com/"; // 👈 עודכן גם פה
const WELCOME_IMAGE_URL = "https://files.oaiusercontent.com/file-F362F5C1-B1B9-4E69-B920-02FDECBDC094.jpeg";
// ==============================================

// ✳️ Helper
const tgPost = (method, data) => axios.post(`${TG_API}/${method}`, data);

// =================== WEBHOOK ===================
app.post("/webhook", async (req, res) => {
  try {
    if (!req.is("application/json")) {
      console.log("⚠️ Non-JSON content received");
      return res.status(200).json({ ok: true });
    }

    const update = req.body;
    console.log("📩 Incoming update:", update);

    if (update.pre_checkout_query) {
      await tgPost("answerPreCheckoutQuery", {
        pre_checkout_query_id: update.pre_checkout_query.id,
        ok: true,
      });
    }

    if (update.message && update.message.successful_payment) {
      const sp = update.message.successful_payment;
      console.log("✅ Payment received:", sp);
    }

    if (update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text.trim();

      if (text.startsWith("/start")) {
        await tgPost("sendPhoto", {
          chat_id: chatId,
          photo: WELCOME_IMAGE_URL,
          caption:
            "ברוך הבא ל־*TeamBattle – ישראל נגד עזה* 🇮🇱⚔️🇵🇸\n\nבחר את השפה שלך:",
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[
              { text: "🇮🇱 עברית", callback_data: "lang_he" },
              { text: "🇬🇧 English", callback_data: "lang_en" },
              { text: "🇵🇸 العربية", callback_data: "lang_ar" },
            ]],
          },
        });
      }
    }

    if (update.callback_query) {
      const cq = update.callback_query;
      const chatId = cq.message.chat.id;
      const messageId = cq.message.message_id;
      const data = cq.data;

      const LANGS = {
        he: {
          caption:
            "🇮🇱 *צוות ישראל!* 💪\n\nטאפ להעלאה, תרום כוכבים ותהיה חלק מהניצחון!",
          button: "🚀 פתח את המשחק",
        },
        en: {
          caption:
            "🇮🇱 *Team Israel!* 💪\n\nTap to boost your score and lead the battle!",
          button: "🚀 Open Game",
        },
        ar: {
          caption:
            "🇵🇸 *فريق غزة!* 💪\n\nاضغط للتعزيز وانضم إلى المعركة!",
          button: "🚀 ابدأ اللعبة",
        },
      };

      const chosen =
        data === "lang_he"
          ? LANGS.he
          : data === "lang_en"
          ? LANGS.en
          : LANGS.ar;

      await tgPost("editMessageMedia", {
        chat_id: chatId,
        message_id: messageId,
        media: {
          type: "photo",
          media: WELCOME_IMAGE_URL,
          caption: chosen.caption,
          parse_mode: "Markdown",
        },
        reply_markup: {
          inline_keyboard: [
            [{ text: chosen.button, web_app: { url: MINI_APP_URL } }],
            [{ text: "🌐 שינוי שפה", callback_data: "change_lang" }],
          ],
        },
      });

      await tgPost("answerCallbackQuery", {
        callback_query_id: cq.id,
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("❌ Webhook error:", err?.response?.data || err.message);
    return res.status(200).json({ ok: true });
  }
});

app.get("/webhook", (req, res) => {
  res.status(405).json({ ok: true });
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/setup-webhook", async (req, res) => {
  try {
    const url = `${WEBHOOK_DOMAIN}/webhook`;
    const r = await tgPost("setWebhook", {
      url,
      allowed_updates: ["message", "callback_query", "pre_checkout_query", "successful_payment"],
    });
    res.status(200).send(r.data);
  } catch (err) {
    res.status(500).send(err?.response?.data || err.message);
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
