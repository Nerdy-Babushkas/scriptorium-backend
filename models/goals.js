const express = require("express");
const router = express.Router();

const { getUserFromToken } = require("../services/user-service");
const goalService = require("../services/goal-service");

// GET goals for logged-in user
router.get("/user", async (req, res) => {
  try {
    const user = getUserFromToken(req);
    const goals = await goalService.getGoalsByUser(user._id);

    res.json(goals);
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
});

// ADD goal
router.post("/add", async (req, res) => {
  try {
    const user = getUserFromToken(req);
    const { title, type, current = 0, total, media = null } = req.body;

    if (!title || !type || total == null) {
      return res
        .status(400)
        .json({ message: "title, type and total are required" });
    }

    const goal = await goalService.createGoal(user._id, {
      title,
      type,
      current,
      total,
      media,
    });

    res.json({
      message: "Goal created successfully",
      goal,
    });
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
});

// UPDATE goal progress
router.put("/update/:id/progress", async (req, res) => {
  try {
    const user = getUserFromToken(req);

    const { current } = req.body;

    if (current === undefined || isNaN(current)) {
      return res
        .status(400)
        .json({ message: "current progress must be a number" });
    }

    const goal = await goalService.updateGoalProgress(
      user._id,
      req.params.id,
      Number(current),
    );

    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    res.json({
      message: "Goal updated successfully",
      goal,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// update whole goal (edit modal)
router.put("/update/:id", async (req, res) => {
  try {
    const user = getUserFromToken(req);

    const { title, type, total, current, media } = req.body;

    const goal = await goalService.updateGoal(user._id, req.params.id, {
      title,
      type,
      total,
      current,
      media,
    });

    if (!goal) return res.status(404).json({ message: "Goal not found" });

    res.json({ message: "Goal updated successfully", goal });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE goal
router.delete("/delete/:id", async (req, res) => {
  try {
    const user = getUserFromToken(req);

    const deleted = await goalService.deleteGoal(user._id, req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "Goal not found" });
    }

    res.json({
      message: "Goal deleted successfully",
    });
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
});

module.exports = router;
