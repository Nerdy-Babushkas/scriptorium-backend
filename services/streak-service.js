// services/streak-service.js
const Streak = require("../models/Streak");
const badgeService = require("./badge-service");
const yarnService = require("./yarn-service");

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function toUTCDay(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function dayDiff(a, b) {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((toUTCDay(a) - toUTCDay(b)) / msPerDay);
}

// ─── CORE: record activity ─────────────────────────────────────────────────────

async function recordActivity(userId) {
  const today = toUTCDay(new Date());

  let streak = await Streak.findOne({ user: userId });

  if (!streak) {
    streak = new Streak({
      user: userId,
      current: 1,
      longest: 1,
      lastActiveDate: today,
      totalActiveDays: 1,
      graceDaysAvailable: 0,
    });
    await streak.save();
    const newBadges = await badgeService.onStreakUpdate(userId, 1, 1);
    // No milestone yarn on day 1 (milestones are every 7 days)
    return { streak, newBadges };
  }

  const diff = dayDiff(today, streak.lastActiveDate);

  if (diff === 0) {
    // Already recorded today — nothing changes
    return { streak, newBadges: [] };
  }

  let hitMilestone = false;

  if (diff === 1) {
    streak.current += 1;
    streak.totalActiveDays += 1;
    if (streak.current % 7 === 0) {
      streak.graceDaysAvailable += 1;
      hitMilestone = true;
    }
  } else if (diff === 2 && streak.graceDaysAvailable > 0) {
    streak.graceDaysAvailable -= 1;
    streak.current += 1;
    streak.totalActiveDays += 1;
    if (streak.current % 7 === 0) {
      hitMilestone = true;
    }
  } else {
    // Streak broken
    streak.current = 1;
    streak.totalActiveDays += 1;
  }

  streak.lastActiveDate = today;
  streak.longest = Math.max(streak.longest, streak.current);
  await streak.save();

  const newBadges = await badgeService.onStreakUpdate(
    userId,
    streak.current,
    streak.totalActiveDays,
  );

  // ── Yarn rewards ────────────────────────────────────────────────────────────
  try {
    const yarnOps = [];
    if (hitMilestone) yarnOps.push(yarnService.onStreakMilestone(userId));
    if (newBadges.length)
      yarnOps.push(yarnService.onBadgeEarned(userId, newBadges.length));
    if (yarnOps.length) await Promise.all(yarnOps);
  } catch (yarnErr) {
    console.error("Yarn award failed in streak (non-fatal):", yarnErr.message);
  }

  return { streak, newBadges };
}

// ─── QUERY ────────────────────────────────────────────────────────────────────

async function getStreak(userId) {
  const streak = await Streak.findOne({ user: userId });
  if (!streak) {
    return {
      current: 0,
      longest: 0,
      lastActiveDate: null,
      graceDaysAvailable: 0,
      totalActiveDays: 0,
    };
  }

  const diff = streak.lastActiveDate
    ? dayDiff(new Date(), streak.lastActiveDate)
    : 99;

  if (diff > 1 && streak.graceDaysAvailable === 0 && streak.current > 0) {
    streak.current = 0;
    await streak.save();
  } else if (diff > 2 && streak.current > 0) {
    streak.current = 0;
    await streak.save();
  }

  return streak;
}

// ─── MANUAL RESET (admin / testing) ──────────────────────────────────────────

async function resetStreak(userId) {
  await Streak.findOneAndDelete({ user: userId });
  return { message: "Streak reset" };
}

module.exports = {
  recordActivity,
  getStreak,
  resetStreak,
};
