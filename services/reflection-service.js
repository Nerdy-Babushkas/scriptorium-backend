// services/reflection-service.js
const Reflection = require("../models/Reflection");

// ================= CREATE REFLECTION =================
async function createReflection(reflectionData) {
  // Avoid duplicate reflections for same user + item + date
  const existing = await Reflection.findOne({
    user: reflectionData.user,
    item: reflectionData.item,
    date: reflectionData.date || { $exists: false },
  });

  if (existing) {
    throw new Error("Reflection already exists for this item and date");
  }

  const reflection = new Reflection(reflectionData);
  return await reflection.save();
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
