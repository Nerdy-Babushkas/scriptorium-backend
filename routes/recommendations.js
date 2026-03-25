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

    // 1. Fetch favorite movies
    const favoriteMovies = await movieService.getUserShelf(
      user._id,
      "favorites",
    );

    if (favoriteMovies.length === 0) {
      return res.json({
        message: "No favorite movies found",
        recommendations: [],
      });
    }

    // 2. Build AI prompt from favorites
    const movieTitles = favoriteMovies.map((m) => m.title).join(", ");
    const prompt = `
I like the following movies: ${movieTitles}.
Based on these, recommend 5 more movies in the same style.
Return JSON in this format:
{
  "recommendations": [
    {"title": "...", "year": 2000, "director": "...", "reason": "...", "tags": ["..."]}
  ]
}
Do not include extra text.
`;

    // 3. Get AI recommendations
    let aiRecommendations = await getRecommendations(prompt);

    if (aiRecommendations.length === 0) {
      return res.json({
        message: "No recommendations found",
        recommendations: [],
      });
    }

    // 4. Fetch real movie data from OMDb using advanced search
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
