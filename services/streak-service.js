const Streak = require("../models/Streak");
const badgeService = require("./badge-service");

// ─── HELPERS ──────────────────────────────────────────────────────────────────

// Strip time from a date so we only compare calendar days (UTC).
function toUTCDay(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function dayDiff(a, b) {
  // Returns number of whole UTC days between two dates (a - b).
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((toUTCDay(a) - toUTCDay(b)) / msPerDay);
}

// ─── CORE: record activity ─────────────────────────────────────────────────────
// Call this whenever the user does *anything* meaningful in the app.
// Returns { streak, newBadges } so the caller can surface badges to the frontend.

async function recordActivity(userId) {
  const today = toUTCDay(new Date());

  let streak = await Streak.findOne({ user: userId });

  if (!streak) {
    // First ever activity for this user
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
    return { streak, newBadges };
  }

  const diff = dayDiff(today, streak.lastActiveDate);

  if (diff === 0) {
    // Already recorded activity today — nothing to change
    return { streak, newBadges: [] };
  }

  if (diff === 1) {
    // Consecutive day — extend the streak
    streak.current += 1;
    streak.totalActiveDays += 1;

    // Award one grace day for every completed 7-day block
    if (streak.current % 7 === 0) {
      streak.graceDaysAvailable += 1;
    }
  } else if (diff === 2 && streak.graceDaysAvailable > 0) {
    // Missed exactly one day but has a grace day — spend it silently
    streak.graceDaysAvailable -= 1;
    streak.current += 1;
    streak.totalActiveDays += 1;
  } else {
    // Streak broken — reset
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

  return { streak, newBadges };
}

// ─── QUERY ────────────────────────────────────────────────────────────────────

async function getStreak(userId) {
  const streak = await Streak.findOne({ user: userId });
  if (!streak) {
    // Return a zeroed-out object so the frontend never gets a 404 on first load
    return {
      current: 0,
      longest: 0,
      lastActiveDate: null,
      graceDaysAvailable: 0,
      totalActiveDays: 0,
    };
  }

  // If the user hasn't been active today or yesterday (and has no grace),
  // their current streak is already stale — reset it lazily on read.
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
