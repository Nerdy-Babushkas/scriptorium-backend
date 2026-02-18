const Goal = require('../models/Goal');

const getGoalsByUser = async (userId) => {
  return await Goal.find({ user: userId });
};

const createGoal = async (userId, goalData) => {
  const newGoal = new Goal({
    user: userId,
    ...goalData
  });

  return await newGoal.save();
};

const updateGoalProgress = async (userId, goalId, currentValue) => {
  const goal = await Goal.findOne({ _id: goalId, user: userId });
  if (!goal) return null;

  goal.current = currentValue;

  if (goal.current >= goal.total) {
    goal.status = 'completed';
  }

  return await goal.save();
};

module.exports = {
  getGoalsByUser,
  createGoal,
  updateGoalProgress
};
