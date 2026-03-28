// routes/recommendations.js
const express = require("express");
const router = express.Router();
const axios = require("axios");

const { getUserFromToken } = require("../services/user-service");
const movieService = require("../services/movie-service");
const { getRecommendations } = require("../services/recommendations-service");

// ================= GET AI RECOMMENDATIONS BASED ON FAVORITES =================
router.get("/movies", async (req, res) => {
  try {
    const user = getUserFromToken(req);
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    // 1. Fetch favorites (basis for recommendations)
    //    and all other shelves in parallel (used to exclude duplicates)
    const [favoriteMovies, watchedMovies, watchlistMovies, watchingMovies] =
      await Promise.all([
        movieService.getUserShelf(user._id, "favorites"),
        movieService.getUserShelf(user._id, "watched"),
        movieService.getUserShelf(user._id, "watchlist"),
        movieService.getUserShelf(user._id, "watching"),
      ]);

    if (favoriteMovies.length === 0) {
      return res.json({
        message: "No favorite movies found",
        recommendations: [],
      });
    }

    // 2. Build a normalised exclusion set across all shelves
    //    (lowercase + trimmed so comparisons are case-insensitive)
    const normalize = (title) => title.trim().toLowerCase();

    const excludedTitles = new Set([
      ...watchedMovies.map((m) => normalize(m.title)),
      ...watchlistMovies.map((m) => normalize(m.title)),
      ...watchingMovies.map((m) => normalize(m.title)),
    ]);

    // 3. Build AI prompt — tell the model what to recommend AND what to skip
    const favoriteTitles = favoriteMovies.map((m) => m.title).join(", ");
    const excludedList = [...excludedTitles].join(", ");

    const prompt = `
I like the following movies: ${favoriteTitles}.
Based on these, recommend 5 more movies in the same style.

Do NOT recommend any of these titles (I already have them in my library): ${excludedList}.

Return JSON in this format:
{
  "recommendations": [
    {"title": "...", "year": 2000, "director": "...", "reason": "...", "tags": ["..."]}
  ]
}
Do not include extra text.
`;

    // 4. Get AI recommendations
    let aiRecommendations = await getRecommendations(prompt);

    if (aiRecommendations.length === 0) {
      return res.json({
        message: "No recommendations found",
        recommendations: [],
      });
    }

    // 5. Post-filter: drop anything the AI still returned that's in the library.
    //    This catches near-matches the AI might ignore from the prompt instruction.
    aiRecommendations = aiRecommendations.filter(
      (rec) => !excludedTitles.has(normalize(rec.title)),
    );

    // 6. Fetch real movie data from OMDb for remaining recommendations
    const apiKey = process.env.OMDB_API_KEY;
    const movies = [];

    for (const rec of aiRecommendations) {
      try {
        const url = `https://www.omdbapi.com/?apikey=${apiKey}&t=${encodeURIComponent(
          rec.title,
        )}${rec.year ? `&y=${rec.year}` : ""}`;

        const response = await axios.get(url);
        const data = response.data;

        if (data && data.Response !== "False") {
          // Final safety check: OMDb may resolve to a slightly different title
          // (e.g. "Aliens" → "Alien") — skip if that resolved title is excluded too
          if (excludedTitles.has(normalize(data.Title))) continue;

          movies.push({
            _id: data.imdbID,
            title: data.Title,
            year: data.Year,
            director: data.Director,
            poster: data.Poster,
            type: data.Type,
            reason: rec.reason,
            tags: rec.tags,
          });
        }
      } catch (err) {
        console.warn(`Failed to fetch OMDb info for ${rec.title}`, err.message);
      }
    }

    res.json({ recommendations: movies });
  } catch (err) {
    console.error("Recommendations error:", err.message);
    res
      .status(500)
      .json({ message: "Failed to fetch recommendations", error: err.message });
  }
});

module.exports = router;
