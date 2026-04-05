// services/media-count-service.js
//
// Single source of truth for "how many items has this user saved across all media types".
// Counting from the User document (shelf arrays) rather than querying Book/Movie/Music
// models individually keeps this fast — no cross-collection joins needed.
//
// Deduplication note: a book in "favorites" AND "reading" is one item saved to two shelves.
// We count unique item IDs per media type to avoid inflating the number.

const User = require("../models/User");

async function getTotalMediaCount(userId) {
  const user = await User.findById(userId).lean();
  if (!user) return 0;

  // Collect unique IDs per media type using Sets, then sum the sizes.
  // This handles the case where the same item sits on multiple shelves.
  const uniqueBooks = new Set(
    (user.bookshelves || [])
      .flatMap((s) => s.books)
      .filter(Boolean)
      .map((id) => id.toString()),
  );

  const uniqueMovies = new Set(
    (user.movieshelves || [])
      .flatMap((s) => s.movies)
      .filter(Boolean)
      .map((id) => id.toString()),
  );

  const uniqueTracks = new Set(
    (user.musicShelves || [])
      .flatMap((s) => s.tracks)
      .filter(Boolean)
      .map((id) => id.toString()),
  );

  return uniqueBooks.size + uniqueMovies.size + uniqueTracks.size;
}

module.exports = { getTotalMediaCount };
