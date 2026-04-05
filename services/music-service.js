// services/music-service.js
const Music = require("../models/Music");
const User = require("../models/User");
const badgeService = require("./badge-service");
const { getTotalMediaCount } = require("./media-count-service");

// ================= SAVE TRACK =================
async function saveTrack(trackData) {
  const existing = await Music.findById(trackData._id);
  if (existing) return existing;

  const track = new Music(trackData);
  return await track.save();
}

// ================= GET TRACK =================
async function getTrackById(trackId) {
  const track = await Music.findById(trackId);
  if (!track) throw new Error("Track not found");
  return track;
}

// ================= GET MANY TRACKS =================
async function getTracksByIds(trackIds) {
  return await Music.find({ _id: { $in: trackIds } });
}

// ================= ADD TRACK TO USER SHELF =================
async function addTrackToShelf(userId, trackId, shelfName) {
  const ALLOWED_SHELVES = ["favorites", "wishlist", "listening", "finished"];

  if (!ALLOWED_SHELVES.includes(shelfName)) {
    throw new Error(
      `Invalid shelf name. Allowed: ${ALLOWED_SHELVES.join(", ")}`,
    );
  }

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  let shelf = user.musicShelves.find((s) => s.name === shelfName);

  if (!shelf) {
    shelf = { name: shelfName, tracks: [] };
    user.musicShelves.push(shelf);
  }

  const isNew = !shelf.tracks.includes(trackId);

  if (isNew) {
    shelf.tracks.push(trackId);
    await user.save();

    // ── Gamification hook ───────────────────────────────────────────────────
    try {
      const total = await getTotalMediaCount(userId);
      await badgeService.onMediaSaved(userId, total);
    } catch (err) {
      console.error("onMediaSaved badge failed (non-fatal):", err.message);
    }
  }

  return { message: `Track added to ${shelfName}` };
}

// ================= GET SPECIFIC USER SHELF =================
async function getUserShelf(userId, shelfName) {
  const ALLOWED_SHELVES = ["favorites", "wishlist", "listening", "finished"];

  if (!ALLOWED_SHELVES.includes(shelfName)) {
    throw new Error("Invalid shelf name");
  }

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const shelf = user.musicShelves.find((s) => s.name === shelfName);
  if (!shelf) return [];

  return await getTracksByIds(shelf.tracks);
}

// ================= GET ALL USER SHELVES =================
async function getAllUserShelves(userId) {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const getShelfTracks = async (shelfName) => {
    const shelf = user.musicShelves.find((s) => s.name === shelfName);
    return await getTracksByIds(shelf?.tracks || []);
  };

  return {
    favorites: await getShelfTracks("favorites"),
    wishlist: await getShelfTracks("wishlist"),
    listening: await getShelfTracks("listening"),
    finished: await getShelfTracks("finished"),
  };
}

// ================= REMOVE TRACK FROM USER SHELF =================
async function removeTrackFromShelf(userId, trackId, shelfName) {
  const ALLOWED_SHELVES = ["favorites", "wishlist", "listening", "finished"];

  if (!ALLOWED_SHELVES.includes(shelfName)) {
    throw new Error(
      `Invalid shelf name. Allowed: ${ALLOWED_SHELVES.join(", ")}`,
    );
  }

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const shelf = user.musicShelves.find((s) => s.name === shelfName);
  if (!shelf) throw new Error("Shelf not found");

  const originalLength = shelf.tracks.length;
  shelf.tracks = shelf.tracks.filter(
    (id) => id.toString() !== trackId.toString(),
  );

  if (shelf.tracks.length === originalLength) {
    return { message: "Track was not in shelf" };
  }

  await user.save();
  return { message: `Track removed from ${shelfName}` };
}

module.exports = {
  saveTrack,
  getTrackById,
  getTracksByIds,
  addTrackToShelf,
  getUserShelf,
  getAllUserShelves,
  removeTrackFromShelf,
};
