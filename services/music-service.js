// services/music-service.js
const Music = require("../models/Music");
const User = require("../models/User");

// ================= SAVE TRACK =================
async function saveTrack(trackData) {
  const existing = await Music.findById(trackData._id);
  if (existing) return existing; // avoid duplicates

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
  if (!["favorites", "wishlist"].includes(shelfName)) {
    throw new Error("Invalid shelf name");
  }

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const shelf = user.musicShelves.find((s) => s.name === shelfName);
  if (!shelf) throw new Error(`Shelf "${shelfName}" not found`);

  // Add track if not already in shelf
  if (!shelf.tracks.includes(trackId)) {
    shelf.tracks.push(trackId); // tracks are strings (UUIDs)
    await user.save();
  } else {
    throw new Error("Track already in shelf");
  }

  return { message: `Track added to ${shelfName}` };
}

// ================= GET SPECIFIC USER SHELF =================
async function getUserShelf(userId, shelfName) {
  if (!["favorites", "wishlist"].includes(shelfName)) {
    throw new Error("Invalid shelf name");
  }

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const shelf = user.musicShelves.find((s) => s.name === shelfName);
  if (!shelf) throw new Error(`Shelf "${shelfName}" not found`);

  return await getTracksByIds(shelf.tracks);
}

// ================= GET ALL USER SHELVES =================
async function getAllUserShelves(userId) {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const favoritesShelf = user.musicShelves.find((s) => s.name === "favorites");
  const wishlistShelf = user.musicShelves.find((s) => s.name === "wishlist");

  const favorites = await getTracksByIds(favoritesShelf?.tracks || []);
  const wishlist = await getTracksByIds(wishlistShelf?.tracks || []);

  return { favorites, wishlist };
}

// ================= REMOVE TRACK FROM USER SHELF =================
async function removeTrackFromShelf(userId, trackId, shelfName) {
  console.log("🔹 removeTrackFromShelf called:", {
    userId,
    trackId,
    shelfName,
  });

  if (!["favorites", "wishlist"].includes(shelfName)) {
    throw new Error("Invalid shelf name");
  }

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const shelf = user.musicShelves.find((s) => s.name === shelfName);
  if (!shelf) throw new Error(`Shelf "${shelfName}" not found`);

  const originalLength = shelf.tracks.length;
  shelf.tracks = shelf.tracks.filter((id) => id !== trackId);

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
