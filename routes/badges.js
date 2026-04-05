const express = require("express");
const router = express.Router();
const { getUserFromToken } = require("../services/user-service");
const badgeService = require("../services/badge-service");

// ── GET all badges earned by the logged-in user ──────────────────────────────
// GET /api/badges
router.get("/", async (req, res) => {
  try {
    const user = getUserFromToken(req);
    const badges = await badgeService.getBadgesForUser(user._id);
    res.json({ badges, total: badges.length });
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
});

// ── GET the full badge catalogue (what badges exist + their descriptions) ─────
// GET /api/badges/catalogue
router.get("/catalogue", async (req, res) => {
  try {
    const catalogue = await badgeService.getBadgeCatalogue();
    res.json({ catalogue });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Manually trigger a badge award — for testing only ────────────────────────
// POST /api/badges/award
// Body: { "key": "streak_7" }
// Remove or gate behind an admin check before going to production.
router.post("/award", async (req, res) => {
  try {
    const user = getUserFromToken(req);
    const { key } = req.body;
    if (!key) return res.status(400).json({ message: "key is required" });

    const badge = await badgeService.awardIfNew(user._id, key);
    if (!badge) {
      return res.json({ message: "Badge already owned", alreadyOwned: true });
    }
    res.json({ message: "Badge awarded", badge });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
