// routes/recommendations.js
const express = require("express");
const router = express.Router();
const axios = require("axios");

const { getUserFromToken } = require("../services/user-service");
const movieService = require("../services/movie-service");
const musicService = require("../services/music-service");
const booksService = require("../services/book-service");
const { getRecommendations } = require("../services/recommendations-service");

// ─── Shared helper ────────────────────────────────────────────────────────────
const normalize = (str) => str.trim().toLowerCase();

// ─────────────────────────────────────────────────────────────────────────────
// GET /recommendations/movies
// ─────────────────────────────────────────────────────────────────────────────
router.get("/movies", async (req, res) => {
  try {
    const user = getUserFromToken(req);
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const [favorites, watched, watchlist, watching] = await Promise.all([
      movieService.getUserShelf(user._id, "favorites"),
      movieService.getUserShelf(user._id, "watched"),
      movieService.getUserShelf(user._id, "watchlist"),
      movieService.getUserShelf(user._id, "watching"),
    ]);

    if (favorites.length === 0) {
      return res.json({
        message: "No favorite movies found",
        recommendations: [],
      });
    }

    const excludedTitles = new Set(
      [...watched, ...watchlist, ...watching].map((m) => normalize(m.title)),
    );

    const prompt = `
I like the following movies: ${favorites.map((m) => m.title).join(", ")}.
Based on these, recommend 5 more movies in the same style.

Do NOT recommend any of these titles (I already have them in my library): ${[...excludedTitles].join(", ")}.

Return JSON in this format:
{
  "recommendations": [
    {"title": "...", "year": 2000, "director": "...", "reason": "...", "tags": ["..."]}
  ]
}
Do not include extra text.
`;

    let aiRecs = await getRecommendations(prompt);
    if (aiRecs.length === 0) {
      return res.json({
        message: "No recommendations found",
        recommendations: [],
      });
    }

    aiRecs = aiRecs.filter((rec) => !excludedTitles.has(normalize(rec.title)));

    const apiKey = process.env.OMDB_API_KEY;
    const movies = [];

    for (const rec of aiRecs) {
      try {
        const url = `https://www.omdbapi.com/?apikey=${apiKey}&t=${encodeURIComponent(rec.title)}${rec.year ? `&y=${rec.year}` : ""}`;
        const { data } = await axios.get(url);

        if (!data || data.Response === "False") continue;
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
      } catch (err) {
        console.warn(`OMDb lookup failed for "${rec.title}":`, err.message);
      }
    }

    res.json({ recommendations: movies });
  } catch (err) {
    console.error("Movie recommendations error:", err.message);
    res.status(500).json({
      message: "Failed to fetch movie recommendations",
      error: err.message,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /recommendations/music
// ─────────────────────────────────────────────────────────────────────────────
router.get("/music", async (req, res) => {
  try {
    const user = getUserFromToken(req);
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const [favorites, listening] = await Promise.all([
      musicService.getUserShelf(user._id, "favorites"),
      musicService.getUserShelf(user._id, "listening"),
    ]);

    if (favorites.length === 0) {
      return res.json({
        message: "No favorite tracks found",
        recommendations: [],
      });
    }

    const excludedTitles = new Set(
      [...listening].map((t) => normalize(t.title)),
    );

    const toLabel = (t) => `"${t.title}" by ${t.artist?.name || "Unknown"}`;

    const prompt = `
I love the following tracks: ${favorites.map(toLabel).join(", ")}.
Based on these, recommend 5 more tracks in the same style or genre.

Do NOT recommend any of these titles (I already have them in my library): ${[...excludedTitles].join(", ")}.

Return JSON in this exact format:
{
  "recommendations": [
    {"title": "...", "artist": "...", "album": "...", "year": 2000, "reason": "...", "tags": ["..."]}
  ]
}
Do not include extra text.
`;

    let aiRecs = await getRecommendations(prompt);
    if (aiRecs.length === 0) {
      return res.json({
        message: "No recommendations found",
        recommendations: [],
      });
    }

    aiRecs = aiRecs.filter((rec) => !excludedTitles.has(normalize(rec.title)));

    const tracks = [];

    for (const rec of aiRecs) {
      try {
        const query = [
          rec.title ? `recording:${rec.title}` : "",
          rec.artist ? `artist:${rec.artist}` : "",
        ]
          .filter(Boolean)
          .join(" AND ");

        const url = `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(query)}&fmt=json&limit=1`;
        const { data } = await axios.get(url, {
          headers: {
            "User-Agent": "ScriptoriumApp/1.0 ( babushkas.prj@gmail.com )",
          },
        });

        const item = data?.recordings?.[0];
        if (!item) continue;
        if (excludedTitles.has(normalize(item.title))) continue;

        const release = item.releases?.[0] || {};
        const releaseMbid = release.id;

        tracks.push({
          _id: item.id,
          title: item.title,
          artist: {
            name: item["artist-credit"]?.[0]?.name || rec.artist || "Unknown",
            mbid: item["artist-credit"]?.[0]?.artist?.id,
          },
          release: {
            title: release.title || rec.album,
            mbid: release.id,
            date: release.date || String(rec.year || ""),
          },
          duration: item.length,
          coverUrl: releaseMbid
            ? `https://coverartarchive.org/release/${releaseMbid}/front-250`
            : null,
          reason: rec.reason,
          tags: rec.tags,
        });
      } catch (err) {
        console.warn(
          `MusicBrainz lookup failed for "${rec.title}":`,
          err.message,
        );
      }
    }

    res.json({ recommendations: tracks });
  } catch (err) {
    console.error("Music recommendations error:", err.message);
    res.status(500).json({
      message: "Failed to fetch music recommendations",
      error: err.message,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /recommendations/books
// ─────────────────────────────────────────────────────────────────────────────
router.get("/books", async (req, res) => {
  try {
    const user = getUserFromToken(req);
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const [favorites, read, wishlist, reading] = await Promise.all([
      booksService.getUserShelf(user._id, "favorites"),
      booksService.getUserShelf(user._id, "finished"),
      booksService.getUserShelf(user._id, "wishlist"),
      booksService.getUserShelf(user._id, "reading"),
    ]);

    if (favorites.length === 0) {
      return res.json({
        message: "No favorite books found",
        recommendations: [],
      });
    }

    const excludedTitles = new Set(
      [...read, ...wishlist, ...reading].map((b) => normalize(b.title)),
    );

    const toLabel = (b) => `"${b.title}" by ${b.authors?.[0] || "Unknown"}`;

    const prompt = `
I love the following books: ${favorites.map(toLabel).join(", ")}.
Based on these, recommend 5 more books in the same genre or style.

Do NOT recommend any of these titles (I already have them in my library): ${[...excludedTitles].join(", ")}.

Return JSON in this exact format:
{
  "recommendations": [
    {"title": "...", "author": "...", "year": 2000, "reason": "...", "tags": ["..."]}
  ]
}
Do not include extra text.
`;

    let aiRecs = await getRecommendations(prompt);
    if (aiRecs.length === 0) {
      return res.json({
        message: "No recommendations found",
        recommendations: [],
      });
    }

    aiRecs = aiRecs.filter((rec) => !excludedTitles.has(normalize(rec.title)));

    const apiKey = process.env.BOOKS_API;
    const books = [];

    for (const rec of aiRecs) {
      try {
        const queryParts = [
          rec.title ? `intitle:${rec.title}` : "",
          rec.author ? `inauthor:${rec.author}` : "",
        ]
          .filter(Boolean)
          .join(" ");

        const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(queryParts)}&maxResults=1&key=${apiKey}`;
        const { data } = await axios.get(url);

        const item = data?.items?.[0];
        if (!item) continue;

        const info = item.volumeInfo;
        if (excludedTitles.has(normalize(info.title))) continue;

        books.push({
          _id: item.id,
          title: info.title,
          authors: info.authors || [rec.author || "Unknown"],
          publisher: info.publisher,
          publishedDate: info.publishedDate,
          description: info.description,
          pageCount: info.pageCount,
          categories: info.categories || rec.tags || [],
          imageLinks: info.imageLinks || {},
          reason: rec.reason,
          tags: rec.tags,
        });
      } catch (err) {
        console.warn(
          `Google Books lookup failed for "${rec.title}":`,
          err.message,
        );
      }
    }

    res.json({ recommendations: books });
  } catch (err) {
    console.error("Book recommendations error:", err.message);
    res.status(500).json({
      message: "Failed to fetch book recommendations",
      error: err.message,
    });
  }
});

module.exports = router;
