const express = require("express");
const router = express.Router();

const { getUserFromToken } = require("../services/user-service");
const goalService = require("../services/goal-service");


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

    const { title, description, targetDate, progress = 0 } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    const goal = await goalService.createGoal({
      user: user._id,
      title,
      description,
      targetDate,
      progress,
    });

    res.json({
      message: "Goal created successfully",
      goal,
    });
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
});


router.put("/update/:id", async (req, res) => {
  try {
    const updates = req.body;
    const goal = await goalService.updateGoal(req.params.id, updates);

    res.json({
      message: "Goal updated successfully",
      goal,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});


module.exports = router;
