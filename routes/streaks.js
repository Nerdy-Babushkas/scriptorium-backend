const express = require("express");
const router = express.Router();
const { getUserFromToken } = require("../services/user-service");
const streakService = require("../services/streak-service");

// ── GET current streak for the logged-in user ─────────────────────────────────
// GET /api/streaks
router.get("/", async (req, res) => {
  try {
    const user = getUserFromToken(req);
    const streak = await streakService.getStreak(user._id);
    res.json(streak);
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
});

// ── Record an activity ping (call this from any action that counts) ───────────
// POST /api/streaks/ping
// No body needed — the user identity comes from the token.
router.post("/ping", async (req, res) => {
  try {
    const user = getUserFromToken(req);
    const { streak, newBadges } = await streakService.recordActivity(user._id);
    res.json({ streak, newBadges });
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
});

// ── Reset streak (testing only — remove or admin-gate in production) ──────────
// DELETE /api/streaks/reset
router.delete("/reset", async (req, res) => {
  try {
    const user = getUserFromToken(req);
    const result = await streakService.resetStreak(user._id);
    res.json(result);
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
});

module.exports = router;
