const Badge = require("../models/Badge");
const yarnService = require("./yarn-service");

// ─── CATALOGUE ────────────────────────────────────────────────────────────────
// All possible badges. key must be unique across the whole catalogue.
// threshold = the numeric value that triggers this badge (interpreted per category).

const CATALOGUE = [
  // ── Streaks ──
  {
    key: "streak_3",
    name: "On a roll",
    icon: "🔥",
    category: "streak",
    description: "3 days in a row",
    threshold: 3,
  },
  {
    key: "streak_7",
    name: "Week warrior",
    icon: "🔥",
    category: "streak",
    description: "7 consecutive days",
    threshold: 7,
  },
  {
    key: "streak_14",
    name: "Two week run",
    icon: "🔥",
    category: "streak",
    description: "14 consecutive days",
    threshold: 14,
  },
  {
    key: "streak_30",
    name: "Full scarf",
    icon: "🧣",
    category: "streak",
    description: "30 consecutive days",
    threshold: 30,
  },
  {
    key: "streak_100",
    name: "Legendary knitter",
    icon: "🧣",
    category: "streak",
    description: "100 consecutive days",
    threshold: 100,
  },

  // ── Reflections ──
  {
    key: "reflection_1",
    name: "First thought",
    icon: "✍️",
    category: "reflection",
    description: "Write your first reflection",
    threshold: 1,
  },
  {
    key: "reflection_5",
    name: "Deep diver",
    icon: "✍️",
    category: "reflection",
    description: "5 reflections written",
    threshold: 5,
  },
  {
    key: "reflection_20",
    name: "Inner library",
    icon: "📖",
    category: "reflection",
    description: "20 reflections written",
    threshold: 20,
  },
  {
    key: "reflection_50",
    name: "Philosopher",
    icon: "🧠",
    category: "reflection",
    description: "50 reflections written",
    threshold: 50,
  },

  // ── Media saved ──
  {
    key: "media_1",
    name: "First save",
    icon: "📌",
    category: "media",
    description: "Save your first item",
    threshold: 1,
  },
  {
    key: "media_10",
    name: "Collector",
    icon: "📚",
    category: "media",
    description: "10 items saved",
    threshold: 10,
  },
  {
    key: "media_50",
    name: "Curator",
    icon: "🗂️",
    category: "media",
    description: "50 items saved",
    threshold: 50,
  },
  {
    key: "media_100",
    name: "The archivist",
    icon: "🏛️",
    category: "media",
    description: "100 items saved",
    threshold: 100,
  },

  // ── Goals ──
  {
    key: "goal_first",
    name: "Goal setter",
    icon: "🎯",
    category: "goal",
    description: "Create your first goal",
    threshold: 1,
  },
  {
    key: "goal_complete_1",
    name: "Goal getter",
    icon: "✅",
    category: "goal",
    description: "Complete your first goal",
    threshold: 1,
  },
  {
    key: "goal_complete_5",
    name: "Achiever",
    icon: "🏆",
    category: "goal",
    description: "Complete 5 goals",
    threshold: 5,
  },

  // ── Milestones ──
  {
    key: "joined",
    name: "Welcome, babushka",
    icon: "🐣",
    category: "milestone",
    description: "Created your Scriptorium account",
    threshold: 0,
  },
  {
    key: "active_30_days",
    name: "Homebody",
    icon: "🏠",
    category: "milestone",
    description: "30 total active days ever",
    threshold: 30,
  },
];

// Fast lookup by key
const BY_KEY = Object.fromEntries(CATALOGUE.map((b) => [b.key, b]));

// ─── HELPERS ──────────────────────────────────────────────────────────────────

// Award a badge if the user hasn't already earned it.
// Returns the saved Badge doc, or null if it was already owned.
async function awardIfNew(userId, key) {
  const def = BY_KEY[key];
  if (!def) throw new Error(`Unknown badge key: ${key}`);

  // Upsert-style: only insert if not already there
  const exists = await Badge.findOne({ user: userId, key });
  if (exists) return null;

  const badge = new Badge({
    user: userId,
    key,
    name: def.name,
    description: def.description,
    icon: def.icon,
    category: def.category,
  });

  return await badge.save();
}

// ─── TRIGGER FUNCTIONS ────────────────────────────────────────────────────────
// Each trigger is called from the relevant route/service after its action succeeds.
// Returns an array of newly awarded Badge docs (empty if nothing new).

async function onStreakUpdate(userId, currentStreak, totalActiveDays) {
  const awarded = [];

  const streakThresholds = [3, 7, 14, 30, 100];
  for (const t of streakThresholds) {
    if (currentStreak >= t) {
      const b = await awardIfNew(userId, `streak_${t}`);
      if (b) awarded.push(b);
    }
  }

  if (totalActiveDays >= 30) {
    const b = await awardIfNew(userId, "active_30_days");
    if (b) awarded.push(b);
  }

  return awarded;
}

async function onReflectionCreated(userId, totalReflections) {
  const awarded = [];
  const thresholds = [1, 5, 20, 50];
  for (const t of thresholds) {
    if (totalReflections >= t) {
      const b = await awardIfNew(userId, `reflection_${t}`);
      if (b) awarded.push(b);
    }
  }
  return awarded;
}

async function onMediaSaved(userId, totalMediaItems) {
  const awarded = [];
  const thresholds = [1, 10, 50, 100];
  for (const t of thresholds) {
    if (totalMediaItems >= t) {
      const b = await awardIfNew(userId, `media_${t}`);
      if (b) awarded.push(b);
    }
  }
  return awarded;
}

async function onGoalCreated(userId) {
  const awarded = [];
  const b = await awardIfNew(userId, "goal_first");
  if (b) awarded.push(b);
  return awarded;
}

async function onGoalCompleted(userId, totalCompletedGoals) {
  const awarded = [];
  const thresholds = [1, 5];
  for (const t of thresholds) {
    if (totalCompletedGoals >= t) {
      const b = await awardIfNew(userId, `goal_complete_${t}`);
      if (b) awarded.push(b);
    }
  }
  return awarded;
}

async function onUserJoined(userId) {
  const b = await awardIfNew(userId, "joined");
  if (!b) return [];

  // Award yarn for the joined badge — non-fatal if it fails
  try {
    await yarnService.onBadgeEarned(userId, 1);
  } catch (err) {
    console.error("Yarn award failed on join (non-fatal):", err.message);
  }

  return [b];
}

// ─── QUERY ────────────────────────────────────────────────────────────────────

async function getBadgesForUser(userId) {
  return await Badge.find({ user: userId }).sort({ earnedAt: -1 });
}

async function getBadgeCatalogue() {
  return CATALOGUE;
}

module.exports = {
  awardIfNew,
  onStreakUpdate,
  onReflectionCreated,
  onMediaSaved,
  onGoalCreated,
  onGoalCompleted,
  onUserJoined,
  getBadgesForUser,
  getBadgeCatalogue,
};
