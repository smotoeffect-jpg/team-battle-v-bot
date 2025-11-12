// TB_V15 Battery Upgrade Module
const { readJSON, writeJSON, ensureUser } = require("../helpers");
const path = require("path");

const USERS_FILE = path.join(__dirname, "../data/users.json");

function registerBatteryUpgrade(app) {
  app.post("/api/upgrade/battery", (req, res) => {
    try {
      const userId = String(req.body?.userId || "").trim();
      if (!userId) return res.status(400).json({ ok: false, error: "Missing userId" });

      const users = readJSON(USERS_FILE, {});
      const u = ensureUser(userId);

      u.batteryLevel = u.batteryLevel || 1;
      const baseCost = 500;
      const cost = Math.floor(baseCost * Math.pow(1.35, u.batteryLevel - 1));

      if ((u.battleBalance || 0) < cost)
        return res.json({ ok: false, error: "not_enough_balance", cost });

      // ✅ ביצוע השדרוג בפועל
      u.battleBalance -= cost;
      u.batteryLevel += 1;
      u.batteryCapacity = Math.floor(100 * Math.pow(1.15, u.batteryLevel - 1));

      writeJSON(USERS_FILE, users);

      res.json({
        ok: true,
        level: u.batteryLevel,
        capacity: u.batteryCapacity,
        balance: u.battleBalance
      });

      console.log(`🔋 Battery upgraded → ${userId} (L${u.batteryLevel})`);
    } catch (err) {
      console.error("❌ Battery upgrade error:", err);
      res.status(500).json({ ok: false, error: "server_error" });
    }
  });
}

module.exports = { registerBatteryUpgrade };
