// routes/avatars.js
const express = require("express");
const router = express.Router();
const { getUserFromToken } = require("../services/user-service");
const avatarService = require("../services/avatar-service");

// ── GET catalogue + user state ────────────────────────────────────────────────
// GET /api/avatars
// Returns the full catalogue with owned/equipped flags for the logged-in user.
router.get("/", async (req, res) => {
  try {
    const user = getUserFromToken(req);
    const state = await avatarService.getAvatarState(user._id);
    res.json(state);
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
});

// ── Unlock an avatar (spends yarns) ──────────────────────────────────────────
// POST /api/avatars/unlock
// Body: { "key": "fox" }
router.post("/unlock", async (req, res) => {
  try {
    const user = getUserFromToken(req);
    const { key } = req.body;

    if (!key) return res.status(400).json({ message: "key is required" });

    const result = await avatarService.unlockAvatar(user._id, key);
    res.json({ message: `${key} unlocked`, ...result });
  } catch (err) {
    const status =
      err.message === "Not enough yarns"
        ? 400
        : err.message === "Avatar already unlocked"
          ? 409
          : err.message === "User not found"
            ? 404
            : 400;
    res.status(status).json({ message: err.message });
  }
});

// ── Equip an avatar ───────────────────────────────────────────────────────────
// POST /api/avatars/equip
// Body: { "key": "fox" }
router.post("/equip", async (req, res) => {
  try {
    const user = getUserFromToken(req);
    const { key } = req.body;

    if (!key) return res.status(400).json({ message: "key is required" });

    const result = await avatarService.equipAvatar(user._id, key);
    res.json({ message: `${key} equipped`, ...result });
  } catch (err) {
    const status =
      err.message === "Avatar not unlocked"
        ? 403
        : err.message === "User not found"
          ? 404
          : 400;
    res.status(status).json({ message: err.message });
  }
});

module.exports = router;
