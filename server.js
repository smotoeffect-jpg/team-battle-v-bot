
const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(bodyParser.json());
app.use(cors());

const BOT_TOKEN = "8366510657:AAEC5for6-8246aKdW6F5w3FPfJ5oWNLCfA";
const WEBHOOK_DOMAIN = "https://team-battle-v-bot.onrender.com";
const MINI_APP_URL = "https://team-battle-v-bot.onrender.com/";
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

app.post("/webhook", async (req, res) => {
  const update = req.body;
  console.log("📩 Update:", update);
  try {
    if (update.message && update.message.text === "/start") {
      await axios.post(`${TG_API}/sendMessage`, {
        chat_id: update.message.chat.id,
        text: "ברוך הבא ל־TeamBattle 🇮🇱⚔️🇵🇸",
      });
    }
  } catch (err) {
    console.error("Webhook error:", err?.response?.data || err.message);
  }
  res.send("OK");
});

app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
