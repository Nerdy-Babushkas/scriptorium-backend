const Goal = require("../models/Goal");

const getGoalsByUser = async (userId) => {
  return await Goal.find({ user: userId });
};

const createGoal = async (userId, goalData) => {
  const newGoal = new Goal({
    user: userId,
    ...goalData,
  });

  return await newGoal.save();
};

const updateGoalProgress = async (userId, goalId, currentValue) => {
  const goal = await Goal.findOne({ _id: goalId, user: userId });

  if (!goal) return null;

  const newCurrent = Math.max(0, Math.min(currentValue, goal.total));

  goal.current = newCurrent;

  if (goal.current >= goal.total) {
    goal.status = "completed";
  } else {
    goal.status = "active";
  }

  return await goal.save();
};

const updateGoal = async (userId, goalId, data) => {
  const goal = await Goal.findOne({ _id: goalId, user: userId });
  if (!goal) return null;

  if (data.title !== undefined) goal.title = data.title;
  if (data.type !== undefined) goal.type = data.type;
  if (data.total !== undefined) goal.total = Number(data.total);
  if (data.media !== undefined) goal.media = data.media;

  if (data.current !== undefined) {
    goal.current = Math.max(0, Math.min(Number(data.current), goal.total));
  }

  if (goal.current >= goal.total) {
    goal.status = "completed";
  } else {
    goal.status = "active";
  }

  return await goal.save();
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
  deleteGoal,
  updateGoal,
};