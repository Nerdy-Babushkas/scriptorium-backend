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
  // 1. Allow all 4 shelf types (using 'listening' instead of 'reading')
  const ALLOWED_SHELVES = ["favorites", "wishlist", "listening", "finished"];
  
  if (!ALLOWED_SHELVES.includes(shelfName)) {
    throw new Error(`Invalid shelf name. Allowed: ${ALLOWED_SHELVES.join(', ')}`);
  }

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  // 2. Find shelf OR create it if it doesn't exist
  // Note: accessing musicShelves instead of bookshelves
  let shelf = user.musicShelves.find((s) => s.name === shelfName);
  
  if (!shelf) {
      // Create the missing shelf dynamically
      shelf = { name: shelfName, tracks: [] };
      user.musicShelves.push(shelf);
  }

  // 3. Add track if not present
  if (!shelf.tracks.includes(trackId)) {
    shelf.tracks.push(trackId);
    await user.save();
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
  
  // Return empty list if shelf doesn't exist yet (instead of crashing)
  if (!shelf) return []; 

  return await getTracksByIds(shelf.tracks);
}

// ================= GET ALL USER SHELVES =================
async function getAllUserShelves(userId) {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  // Helper to fetch tracks for a shelf, returns empty array if shelf doesn't exist
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
  // FIX: Updated list to include 'listening' and 'finished'
  const ALLOWED_SHELVES = ["favorites", "wishlist", "listening", "finished"];

  if (!ALLOWED_SHELVES.includes(shelfName)) {
    throw new Error(`Invalid shelf name. Allowed: ${ALLOWED_SHELVES.join(', ')}`);
  }

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const shelf = user.musicShelves.find((s) => s.name === shelfName);
  if (!shelf) throw new Error("Shelf not found");

  const originalLength = shelf.tracks.length;

  // Remove track
  shelf.tracks = shelf.tracks.filter((id) => id.toString() !== trackId.toString());

  if (shelf.tracks.length === originalLength) {
    return { message: "Track was not in shelf" };
  }

  await user.save();
  return { message: `Track
     removed from ${shelfName}` };
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
