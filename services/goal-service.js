const Goal = require("../models/Goal");
const badgeService = require("./badge-service");
const streakService = require("./streak-service");

const getGoalsByUser = async (userId) => {
  return await Goal.find({ user: userId });
};

const createGoal = async (userId, goalData) => {
  const newGoal = new Goal({
    user: userId,
    ...goalData,
  });

  const goal = await newGoal.save();

  // ── Gamification hooks ────────────────────────────────────────────────────
  try {
    const [streakResult, goalBadges] = await Promise.all([
      streakService.recordActivity(userId),
      badgeService.onGoalCreated(userId),
    ]);

    goal._newBadges = [...streakResult.newBadges, ...goalBadges];
  } catch (gamificationErr) {
    console.error(
      "Gamification hook failed (non-fatal):",
      gamificationErr.message,
    );
    goal._newBadges = [];
  }

  return goal;
};

const updateGoalProgress = async (userId, goalId, currentValue) => {
  const goal = await Goal.findOne({ _id: goalId, user: userId });

  if (!goal) return null;

  const wasCompleted = goal.status === "completed";
  const newCurrent = Math.max(0, Math.min(currentValue, goal.total));

  goal.current = newCurrent;
  goal.status = goal.current >= goal.total ? "completed" : "active";

  await goal.save();

  // ── Gamification hooks ────────────────────────────────────────────────────
  try {
    const streakResult = await streakService.recordActivity(userId);
    let completionBadges = [];

    // Only fire completion badges the moment the goal transitions to completed
    if (!wasCompleted && goal.status === "completed") {
      const completedCount = await Goal.countDocuments({
        user: userId,
        status: "completed",
      });
      completionBadges = await badgeService.onGoalCompleted(
        userId,
        completedCount,
      );
    }

    goal._newBadges = [...streakResult.newBadges, ...completionBadges];
  } catch (gamificationErr) {
    console.error(
      "Gamification hook failed (non-fatal):",
      gamificationErr.message,
    );
    goal._newBadges = [];
  }

  return goal;
};

const updateGoal = async (userId, goalId, data) => {
  const goal = await Goal.findOne({ _id: goalId, user: userId });
  if (!goal) return null;

  const wasCompleted = goal.status === "completed";

  if (data.title !== undefined) goal.title = data.title;
  if (data.type !== undefined) goal.type = data.type;
  if (data.total !== undefined) goal.total = Number(data.total);
  if (data.media !== undefined) goal.media = data.media;

  if (data.current !== undefined) {
    goal.current = Math.max(0, Math.min(Number(data.current), goal.total));
  }

  goal.status = goal.current >= goal.total ? "completed" : "active";

  await goal.save();

  // ── Gamification hooks ────────────────────────────────────────────────────
  try {
    const streakResult = await streakService.recordActivity(userId);
    let completionBadges = [];

    // Only fire completion badges the moment the goal transitions to completed
    if (!wasCompleted && goal.status === "completed") {
      const completedCount = await Goal.countDocuments({
        user: userId,
        status: "completed",
      });
      completionBadges = await badgeService.onGoalCompleted(
        userId,
        completedCount,
      );
    }

    goal._newBadges = [...streakResult.newBadges, ...completionBadges];
  } catch (gamificationErr) {
    console.error(
      "Gamification hook failed (non-fatal):",
      gamificationErr.message,
    );
    goal._newBadges = [];
  }

  return goal;
};

const deleteGoal = async (userId, goalId) => {
  const result = await Goal.findOneAndDelete({
    _id: goalId,
    user: userId,
  });

  return result;
};

module.exports = {
  getGoalsByUser,
  createGoal,
  updateGoalProgress,
  updateGoal,
  deleteGoal,
};
