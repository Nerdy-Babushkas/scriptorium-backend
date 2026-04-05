// services/movie-service.js
const Movie = require("../models/Movie");
const User = require("../models/User");
const badgeService = require("./badge-service");
const { getTotalMediaCount } = require("./media-count-service");

// ================= SAVE MOVIE =================
async function saveMovie(movieData) {
  const existing = await Movie.findById(movieData._id);
  if (existing) return existing;

  const movie = new Movie(movieData);
  return await movie.save();
}

// ================= GET MOVIE =================
async function getMovieById(movieId) {
  const movie = await Movie.findById(movieId);
  if (!movie) throw new Error("Movie not found");
  return movie;
}

// ================= GET MANY MOVIES =================
async function getMoviesByIds(movieIds) {
  return await Movie.find({ _id: { $in: movieIds } });
}

// ================= ADD MOVIE TO USER SHELF =================
async function addMovieToShelf(userId, movieId, shelfName) {
  const ALLOWED_SHELVES = ["favorites", "watchlist", "watching", "watched"];

  if (!ALLOWED_SHELVES.includes(shelfName)) {
    throw new Error(
      `Invalid shelf name. Allowed: ${ALLOWED_SHELVES.join(", ")}`,
    );
  }

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  let shelf = user.movieshelves.find((s) => s.name === shelfName);

  if (!shelf) {
    shelf = { name: shelfName, movies: [] };
    user.movieshelves.push(shelf);
  }

  const isNew = !shelf.movies.includes(movieId);

  if (isNew) {
    shelf.movies.push(movieId);
    await user.save();

    // ── Gamification hook ───────────────────────────────────────────────────
    try {
      const total = await getTotalMediaCount(userId);
      await badgeService.onMediaSaved(userId, total);
    } catch (err) {
      console.error("onMediaSaved badge failed (non-fatal):", err.message);
    }
  }

  return { message: `Movie added to ${shelfName}` };
}

// ================= GET SPECIFIC USER SHELF =================
async function getUserShelf(userId, shelfName) {
  const ALLOWED_SHELVES = ["favorites", "watchlist", "watching", "watched"];

  if (!ALLOWED_SHELVES.includes(shelfName)) {
    throw new Error("Invalid shelf name");
  }

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const shelf = user.movieshelves.find((s) => s.name === shelfName);
  if (!shelf) return [];

  return await getMoviesByIds(shelf.movies);
}

// ================= GET ALL USER SHELVES =================
async function getAllUserShelves(userId) {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const getShelfMovies = async (shelfName) => {
    const shelf = user.movieshelves.find((s) => s.name === shelfName);
    return await getMoviesByIds(shelf?.movies || []);
  };

  return {
    favorites: await getShelfMovies("favorites"),
    watchlist: await getShelfMovies("watchlist"),
    watching: await getShelfMovies("watching"),
    watched: await getShelfMovies("watched"),
  };
}

// ================= REMOVE MOVIE FROM USER SHELF =================
async function removeMovieFromShelf(userId, movieId, shelfName) {
  const ALLOWED_SHELVES = ["favorites", "watchlist", "watching", "watched"];

  if (!ALLOWED_SHELVES.includes(shelfName)) {
    throw new Error(
      `Invalid shelf name. Allowed: ${ALLOWED_SHELVES.join(", ")}`,
    );
  }

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const shelf = user.movieshelves.find((s) => s.name === shelfName);
  if (!shelf) throw new Error("Shelf not found");

  const originalLength = shelf.movies.length;
  shelf.movies = shelf.movies.filter(
    (id) => id.toString() !== movieId.toString(),
  );

  if (shelf.movies.length === originalLength) {
    return { message: "Movie was not in shelf" };
  }

  await user.save();
  return { message: `Movie removed from ${shelfName}` };
}

module.exports = {
  saveMovie,
  getMovieById,
  getMoviesByIds,
  addMovieToShelf,
  getUserShelf,
  getAllUserShelves,
  removeMovieFromShelf,
};
