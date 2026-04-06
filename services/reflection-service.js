// services/reflection-service.js
const Reflection = require("../models/Reflection");
const badgeService = require("./badge-service");
const streakService = require("./streak-service");
const yarnService = require("./yarn-service");

// ================= CREATE REFLECTION =================
async function createReflection(reflectionData) {
  // Avoid duplicate reflections for same user + item on the same calendar day.
  const dayStart = new Date(reflectionData.date || Date.now());
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const existing = await Reflection.findOne({
    user: reflectionData.user,
    item: reflectionData.item,
    date: { $gte: dayStart, $lt: dayEnd },
  });

  if (existing) {
    throw new Error("Reflection already exists for this item and date");
  }

  const reflection = await new Reflection(reflectionData).save();

  // ── Gamification hooks ────────────────────────────────────────────────────
  try {
    const userId = reflectionData.user;

    const [totalCount, streakResult] = await Promise.all([
      Reflection.countDocuments({ user: userId }),
      streakService.recordActivity(userId),
    ]);

    const reflectionBadges = await badgeService.onReflectionCreated(
      userId,
      totalCount,
    );

    const allNewBadges = [...streakResult.newBadges, ...reflectionBadges];

    // ── Yarn rewards ──────────────────────────────────────────────────────
    const [yarns] = await Promise.all([
      yarnService.onReflectionWritten(userId),
      allNewBadges.length
        ? yarnService.onBadgeEarned(userId, allNewBadges.length)
        : Promise.resolve(null),
    ]);

    reflection._newBadges = allNewBadges;
    reflection._yarns = yarns;
  } catch (gamificationErr) {
    console.error(
      "Gamification hook failed (non-fatal):",
      gamificationErr.message,
    );
    reflection._newBadges = [];
    reflection._yarns = null;
  }

  return reflection;
}

// ================= GET USER REFLECTIONS =================
async function getUserReflections(userId) {
  return await Reflection.find({ user: userId }).sort({ createdAt: -1 });
}

// ================= GET REFLECTIONS FOR ITEM =================
async function getReflectionsByItem(itemId, itemType) {
  return await Reflection.find({ item: itemId, itemType }).sort({
    createdAt: -1,
  });
}

// ================= GET SPECIFIC REFLECTION =================
async function getReflectionById(reflectionId) {
  const reflection = await Reflection.findById(reflectionId);
  if (!reflection) throw new Error("Reflection not found");
  return reflection;
}

// ================= UPDATE REFLECTION =================
async function updateReflection(reflectionId, updates) {
  const reflection = await Reflection.findById(reflectionId);
  if (!reflection) throw new Error("Reflection not found");

  Object.assign(reflection, updates);
  return await reflection.save();
}

// ================= REMOVE REFLECTION =================
async function removeReflection(reflectionId) {
  const result = await Reflection.findByIdAndDelete(reflectionId);
  if (!result) throw new Error("Reflection not found");
  return { message: "Reflection removed" };
}

module.exports = {
  createReflection,
  getUserReflections,
  getReflectionsByItem,
  getReflectionById,
  updateReflection,
  removeReflection,
};
