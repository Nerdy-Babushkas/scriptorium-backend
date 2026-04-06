// services/avatar-service.js
const User = require("../models/User");
const yarnService = require("./yarn-service");

// ─── CATALOGUE ────────────────────────────────────────────────────────────────
// Single source of truth for all avatar options.
// key must be unique, emoji is what shows in the UI.
// cost = 0 means free / default.

const AVATAR_CATALOGUE = [
  {
    key: "hatchling",
    name: "Hatchling",
    emoji: "🐣",
    cost: 0,
    tier: "default",
  },
  { key: "cat", name: "Cat", emoji: "🐱", cost: 50, tier: "starter" },
  { key: "dog", name: "Dog", emoji: "🐶", cost: 50, tier: "starter" },
  { key: "fox", name: "Fox", emoji: "🦊", cost: 120, tier: "mid" },
  { key: "bear", name: "Bear", emoji: "🐻", cost: 120, tier: "mid" },
  { key: "wolf", name: "Wolf", emoji: "🐺", cost: 150, tier: "mid" },
  { key: "lion", name: "Lion", emoji: "🦁", cost: 250, tier: "premium" },
  { key: "tiger", name: "Tiger", emoji: "🐯", cost: 250, tier: "premium" },
  { key: "dragon", name: "Dragon", emoji: "🐲", cost: 500, tier: "rare" },
  {
    key: "unicorn",
    name: "Unicorn",
    emoji: "🦄",
    cost: 750,
    tier: "legendary",
  },
];

// Fast lookup
const BY_KEY = Object.fromEntries(AVATAR_CATALOGUE.map((a) => [a.key, a]));

// ─── QUERY ────────────────────────────────────────────────────────────────────

// Returns the full catalogue annotated with the user's unlock + equipped state.
async function getAvatarState(userId) {
  const user = await User.findById(userId)
    .select("avatarKey unlockedAvatars")
    .lean();
  if (!user) throw new Error("User not found");

  const unlockedList = user.unlockedAvatars || [];

  if (!unlockedList.includes("hatchling")) {
    unlockedList.push("hatchling");
  }

  const unlocked = new Set(unlockedList);
  const catalogue = AVATAR_CATALOGUE.map((a) => ({
    ...a,
    owned: unlocked.has(a.key),
    equipped: user.avatarKey === a.key,
  }));

  return {
    equipped: user.avatarKey || "hatchling",
    catalogue,
  };
}

// ─── UNLOCK ───────────────────────────────────────────────────────────────────

async function unlockAvatar(userId, key) {
  const def = BY_KEY[key];
  if (!def) throw new Error(`Unknown avatar key: ${key}`);
  if (def.cost === 0) throw new Error("This avatar is already free");

  const user = await User.findById(userId).select("unlockedAvatars");
  if (!user) throw new Error("User not found");

  const already = (user.unlockedAvatars || []).includes(key);
  if (already) throw new Error("Avatar already unlocked");

  // Spend yarns — throws "Not enough yarns" if balance is insufficient
  await yarnService.spendYarns(userId, def.cost);

  // Add to unlocked list
  user.unlockedAvatars.push(key);
  await user.save();

  return { unlockedKey: key, cost: def.cost };
}

// ─── EQUIP ────────────────────────────────────────────────────────────────────

async function equipAvatar(userId, key) {
  const def = BY_KEY[key];
  if (!def) throw new Error(`Unknown avatar key: ${key}`);

  const user = await User.findById(userId).select("avatarKey unlockedAvatars");
  if (!user) throw new Error("User not found");

  const owned = (user.unlockedAvatars || []).includes(key) || def.cost === 0;
  if (!owned) throw new Error("Avatar not unlocked");

  user.avatarKey = key;
  await user.save();

  return { equippedKey: key };
}

// ─── EXPORT ───────────────────────────────────────────────────────────────────

module.exports = {
  AVATAR_CATALOGUE,
  getAvatarState,
  unlockAvatar,
  equipAvatar,
};
