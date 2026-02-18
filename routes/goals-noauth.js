const express = require("express");
const router = express.Router();

const goalService = require("../services/goal-service");

// GET goals for a userId
router.get("/user/:userId", async (req, res) => {
  try {
    const goals = await goalService.getGoalsByUser(req.params.userId);
    res.json(goals);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ADD goal (expects userId in body)
router.post("/add", async (req, res) => {
  try {
    const { userId, title, type, current = 0, total } = req.body;

    if (!userId || !title || !type || !total) {
      return res
        .status(400)
        .json({ message: "userId, title, type and total are required" });
    }

    const goal = await goalService.createGoal(userId, {
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

// UPDATE goal progress (expects userId in body)
router.put("/update/:id", async (req, res) => {
  try {
    const { userId, current } = req.body;

    if (!userId) return res.status(400).json({ message: "userId required" });

    const goal = await goalService.updateGoalProgress(
      userId,
      req.params.id,
      current,
    );

    if (!goal) return res.status(404).json({ message: "Goal not found" });

    res.json({ message: "Goal updated successfully", goal });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
