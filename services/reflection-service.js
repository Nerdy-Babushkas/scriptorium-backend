// services/reflection-service.js
const Reflection = require("../models/Reflection");
const badgeService = require("./badge-service");
const streakService = require("./streak-service");
const yarnService = require("./yarn-service");

// ================= CREATE REFLECTION =================
async function createReflection(reflectionData) {
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
