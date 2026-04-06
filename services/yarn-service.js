// services/yarn-service.js
const Yarn = require("../models/Yarn");

// ─── EARNING RATES ────────────────────────────────────────────────────────────
// Single source of truth — tune these numbers here only.
const YARN_RATES = {
  reflection: 10, // writing a reflection
  goalProgress: 5, // updating goal progress (once per day per goal)
  goalComplete: 25, // completing a goal (one-time bonus)
  streakMilestone: 15, // every 7-day streak block
  badge: 20, // earning any badge
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

// Upsert-safe: finds or creates the user's Yarn doc, then atomically
// increments both balance and lifetimeEarned by `amount`.
// Returns the updated Yarn doc.
async function _addYarns(userId, amount) {
  if (!amount || amount <= 0) return null;

  return await Yarn.findOneAndUpdate(
    { user: userId },
    {
      $inc: { balance: amount, lifetimeEarned: amount },
      $setOnInsert: { user: userId },
    },
    { upsert: true, new: true },
  );
}

// ─── TRIGGER FUNCTIONS ────────────────────────────────────────────────────────
// Called from reflection-service, goal-service, streak-service, and badge-service.
// Each returns { yarns } — the updated Yarn doc — so the frontend can show
// the new balance alongside badge toasts.

async function onReflectionWritten(userId) {
  return await _addYarns(userId, YARN_RATES.reflection);
}

async function onGoalProgressUpdated(userId) {
  return await _addYarns(userId, YARN_RATES.goalProgress);
}

async function onGoalCompleted(userId) {
  // Called in addition to onGoalProgressUpdated when a goal transitions
  // to completed — user gets both the progress yarn and the completion bonus.
  return await _addYarns(userId, YARN_RATES.goalComplete);
}

async function onStreakMilestone(userId) {
  // Called once per 7-day block earned (current % 7 === 0)
  return await _addYarns(userId, YARN_RATES.streakMilestone);
}

async function onBadgeEarned(userId, badgeCount) {
  // badgeCount = number of new badges awarded in this action
  if (!badgeCount || badgeCount <= 0) return null;
  return await _addYarns(userId, YARN_RATES.badge * badgeCount);
}

// ─── SPEND ────────────────────────────────────────────────────────────────────
// Reserved for the shop. Throws if the user doesn't have enough balance.

async function spendYarns(userId, amount) {
  if (!amount || amount <= 0) throw new Error("Amount must be positive");

  const yarn = await Yarn.findOne({ user: userId });
  if (!yarn || yarn.balance < amount) {
    throw new Error("Not enough yarns");
  }

  yarn.balance -= amount;
  return await yarn.save();
}

// ─── QUERY ────────────────────────────────────────────────────────────────────

async function getYarns(userId) {
  const yarn = await Yarn.findOne({ user: userId });
  if (!yarn) return { balance: 0, lifetimeEarned: 0 };
  return yarn;
}

// ─── EXPORT ───────────────────────────────────────────────────────────────────

module.exports = {
  YARN_RATES,
  onReflectionWritten,
  onGoalProgressUpdated,
  onGoalCompleted,
  onStreakMilestone,
  onBadgeEarned,
  spendYarns,
  getYarns,
};
