// services/goal-service.js
const Goal = require("../models/Goal");
const badgeService = require("./badge-service");
const streakService = require("./streak-service");
const yarnService = require("./yarn-service");

const getGoalsByUser = async (userId) => {
  return await Goal.find({ user: userId });
};

const createGoal = async (userId, goalData) => {
  const newGoal = new Goal({ user: userId, ...goalData });
  const goal = await newGoal.save();

  // ── Gamification hooks ────────────────────────────────────────────────────
  try {
    const [streakResult, goalBadges] = await Promise.all([
      streakService.recordActivity(userId),
      badgeService.onGoalCreated(userId),
    ]);

    const allNewBadges = [...streakResult.newBadges, ...goalBadges];

    const yarns = allNewBadges.length
      ? await yarnService.onBadgeEarned(userId, allNewBadges.length)
      : null;

    goal._newBadges = allNewBadges;
    goal._yarns = yarns;
  } catch (gamificationErr) {
    console.error(
      "Gamification hook failed (non-fatal):",
      gamificationErr.message,
    );
    goal._newBadges = [];
    goal._yarns = null;
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
    const justCompleted = !wasCompleted && goal.status === "completed";

    if (justCompleted) {
      const completedCount = await Goal.countDocuments({
        user: userId,
        status: "completed",
      });
      completionBadges = await badgeService.onGoalCompleted(
        userId,
        completedCount,
      );
    }

    const allNewBadges = [...streakResult.newBadges, ...completionBadges];

    // Progress yarn always; completion bonus + badge yarns on top if applicable
    const yarnOps = [yarnService.onGoalProgressUpdated(userId)];
    if (justCompleted) yarnOps.push(yarnService.onGoalCompleted(userId));
    if (allNewBadges.length)
      yarnOps.push(yarnService.onBadgeEarned(userId, allNewBadges.length));
    const [yarns] = await Promise.all(yarnOps);

    goal._newBadges = allNewBadges;
    goal._yarns = yarns;
  } catch (gamificationErr) {
    console.error(
      "Gamification hook failed (non-fatal):",
      gamificationErr.message,
    );
    goal._newBadges = [];
    goal._yarns = null;
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
    const justCompleted = !wasCompleted && goal.status === "completed";

    if (justCompleted) {
      const completedCount = await Goal.countDocuments({
        user: userId,
        status: "completed",
      });
      completionBadges = await badgeService.onGoalCompleted(
        userId,
        completedCount,
      );
    }

    const allNewBadges = [...streakResult.newBadges, ...completionBadges];

    const yarnOps = [yarnService.onGoalProgressUpdated(userId)];
    if (justCompleted) yarnOps.push(yarnService.onGoalCompleted(userId));
    if (allNewBadges.length)
      yarnOps.push(yarnService.onBadgeEarned(userId, allNewBadges.length));
    const [yarns] = await Promise.all(yarnOps);

    goal._newBadges = allNewBadges;
    goal._yarns = yarns;
  } catch (gamificationErr) {
    console.error(
      "Gamification hook failed (non-fatal):",
      gamificationErr.message,
    );
    goal._newBadges = [];
    goal._yarns = null;
  }

  return goal;
};

const deleteGoal = async (userId, goalId) => {
  return await Goal.findOneAndDelete({ _id: goalId, user: userId });
};

module.exports = {
  getGoalsByUser,
  createGoal,
  updateGoalProgress,
  updateGoal,
  deleteGoal,
};
