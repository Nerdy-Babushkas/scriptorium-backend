// routes/goals.js
const express = require("express");
const router = express.Router();

const { getUserFromToken } = require("../services/user-service");
const goalService = require("../services/goal-service");

// =========================
// Existing (JWT header) API
// =========================

router.get("/user", async (req, res) => {
  try {
    const user = getUserFromToken(req);
    const goals = await goalService.getGoalsByUser(user._id);
    res.json(goals);
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
});

router.post("/add", async (req, res) => {
  try {
    const user = getUserFromToken(req);

    const { title, type, current = 0, total } = req.body;

    if (!title || !type || total == null) {
      return res.status(400).json({ message: "title, type and total are required" });
    }

    const goal = await goalService.createGoal(user._id, {
      title,
      type,
      current,
      total,
    });

    res.json({ message: "Goal created successfully", goal });
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
});

router.put("/update/:id", async (req, res) => {
  try {
    const user = getUserFromToken(req);
    const { current } = req.body;

    const goal = await goalService.updateGoalProgress(user._id, req.params.id, current);

    if (!goal) return res.status(404).json({ message: "Goal not found" });

    res.json({ message: "Goal updated successfully", goal });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ==================================
// New (NO Authorization header) API
// For frontend proxy that already
// verified cookie + decoded req.user
// ==================================

// GET goals for a userId
router.get("/user/:userId", async (req, res) => {
  try {
    const goals = await goalService.getGoalsByUser(req.params.userId);
    res.json(goals);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ADD goal for a userId
router.post("/add/:userId", async (req, res) => {
  try {
    const { title, type, current = 0, total } = req.body;

    if (!title || !type || total == null) {
      return res.status(400).json({ message: "title, type and total are required" });
    }

    const goal = await goalService.createGoal(req.params.userId, {
      title,
      type,
      current,
      total,
    });

    res.json({ message: "Goal created successfully", goal });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// UPDATE goal progress for a userId
router.put("/update/:id/:userId", async (req, res) => {
  try {
    const { current } = req.body;

    const goal = await goalService.updateGoalProgress(
      req.params.userId,
      req.params.id,
      current
    );

    if (!goal) return res.status(404).json({ message: "Goal not found" });

    res.json({ message: "Goal updated successfully", goal });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE goal for a userId
router.delete("/delete/:id/:userId", async (req, res) => {
  try {
    const deleted = await goalService.deleteGoal(req.params.userId, req.params.id);
    if (!deleted) return res.status(404).json({ message: "Goal not found" });

    res.json({ message: "Goal deleted successfully" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});




module.exports = router;
