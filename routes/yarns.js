// routes/yarns.js
const express = require("express");
const router = express.Router();
const { getUserFromToken } = require("../services/user-service");
const yarnService = require("../services/yarn-service");

// ── GET current yarn balance ──────────────────────────────────────────────────
// GET /api/yarns
router.get("/", async (req, res) => {
  try {
    const user = getUserFromToken(req);
    const yarns = await yarnService.getYarns(user._id);
    res.json({
      balance: yarns.balance,
      lifetimeEarned: yarns.lifetimeEarned,
    });
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
});

// ── Spend yarns (reserved for shop) ──────────────────────────────────────────
// POST /api/yarns/spend
// Body: { "amount": 50 }
router.post("/spend", async (req, res) => {
  try {
    const user = getUserFromToken(req);
    const { amount } = req.body;

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res
        .status(400)
        .json({ message: "amount must be a positive number" });
    }

    const yarns = await yarnService.spendYarns(user._id, Number(amount));
    res.json({
      message: "Yarns spent successfully",
      balance: yarns.balance,
      lifetimeEarned: yarns.lifetimeEarned,
    });
  } catch (err) {
    const status = err.message === "Not enough yarns" ? 400 : 401;
    res.status(status).json({ message: err.message });
  }
});

// ── Earning rates (so frontend can display them) ──────────────────────────────
// GET /api/yarns/rates
router.get("/rates", async (req, res) => {
  try {
    getUserFromToken(req); // auth check only
    res.json({ rates: yarnService.YARN_RATES });
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
});

module.exports = router;
