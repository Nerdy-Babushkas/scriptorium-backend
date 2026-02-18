//router/goals.js
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

    const { title, type, current = 0, total } = req.body;

    if (!title || !type || !total) {
      return res.status(400).json({ message: "title, type and total are required" });
    }

    const goal = await goalService.createGoal(
      user._id,
      { title, type, current, total }
    );

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
    const user = getUserFromToken(req);
    const { current } = req.body;

    const goal = await goalService.updateGoalProgress(
      user._id,
      req.params.id,
      current
    );

    res.json({
      message: "Goal updated successfully",
      goal,
    });

  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});


module.exports = router;
