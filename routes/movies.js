const express = require("express");
const router = express.Router();
const axios = require("axios");

const { getUserFromToken } = require("../services/user-service");
const movieService = require("../services/movie-service");

// =====================================================
// ================= SEARCH OMDb =================
// =====================================================
router.get("/search", async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res
      .status(400)
      .json({ message: "Missing search query parameter 'q'" });
  }

  try {
    const apiKey = process.env.OMDB_API_KEY;
    const url = `https://www.omdbapi.com/?s=${encodeURIComponent(
      query,
    )}&apikey=${apiKey}`;

    const response = await axios.get(url);

    if (response.data.Response === "False") {
      return res.json({ movies: [] });
    }

    const movies = response.data.Search.map((item) => ({
      _id: item.imdbID,
      title: item.Title,
      year: item.Year,
      poster: item.Poster,
      type: item.Type,
    }));

    res.json({ movies });
  } catch (err) {
    console.error("OMDb API error:", err.message);
    res.status(500).json({ message: "Error fetching movies from OMDb API" });
  }
});

// =====================================================
// ================= SAVE MOVIE =================
// =====================================================
router.post("/", async (req, res) => {
  try {
    const movie = await movieService.saveMovie(req.body);
    res.json(movie);
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
});

// =====================================================
// ================= GET ALL USER SHELVES =================
// =====================================================
router.get("/shelf", async (req, res) => {
  try {
    const user = getUserFromToken(req);
    const shelves = await movieService.getAllUserShelves(user._id);
    res.json(shelves);
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
});

// =====================================================
// ================= GET SPECIFIC USER SHELF =================
// =====================================================
router.get("/shelf/:shelf", async (req, res) => {
  try {
    const user = getUserFromToken(req);
    const shelf = req.params.shelf;

    const movies = await movieService.getUserShelf(user._id, shelf);
    res.json(movies);
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
});

// =====================================================
// ================= GET MOVIE =================
// =====================================================
router.get("/:id", async (req, res) => {
  try {
    const movie = await movieService.getMovieById(req.params.id);
    res.json(movie);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
});

// =====================================================
// ================= ADD MOVIE TO USER SHELF =================
// =====================================================
router.post("/shelf/add", async (req, res) => {
  try {
    const user = getUserFromToken(req);
    const { shelf, ...movieData } = req.body;

    if (!shelf) {
      return res.status(400).json({ message: "Shelf is required" });
    }

    if (!movieData._id || !movieData.title) {
      return res.status(400).json({
        message: "Movie must include at least _id (imdbID) and title",
      });
    }

    // 1. Check if movie exists
    let movie = await movieService
      .getMovieById(movieData._id)
      .catch(() => null);

    if (!movie) {
      movie = await movieService.saveMovie(movieData);
    }

    // 2. Add to shelf
    const result = await movieService.addMovieToShelf(
      user._id,
      movie._id,
      shelf,
    );

    res.json({
      message: result.message,
      shelf,
      movie,
    });
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
});

// =====================================================
// ================= REMOVE MOVIE FROM USER SHELF =================
// =====================================================
router.post("/shelf/remove", async (req, res) => {
  try {
    const user = getUserFromToken(req);
    const { movieId, shelf } = req.body;

    if (!movieId || !shelf) {
      return res.status(400).json({
        message: "movieId and shelf are required",
      });
    }

    const result = await movieService.removeMovieFromShelf(
      user._id,
      movieId,
      shelf,
    );

    res.json(result);
  } catch (err) {
    console.error("Remove shelf error:", err.message);
    res.status(401).json({ message: err.message });
  }
});

// =====================================================
// ================= ADVANCED SEARCH =================
// =====================================================
router.get("/advanced/search", async (req, res) => {
  try {
    const { q, title, actor, genre, year, page = 1, type } = req.query;
    const apiKey = process.env.OMDB_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ message: "OMDb API key not set" });
    }

    if (!q && !title && !actor && !genre && !year) {
      return res
        .status(400)
        .json({ message: "Provide at least one search parameter" });
    }

    // Use 's' search or exact title 't'
    const searchTerm = q || title || "";
    const searchUrl = `https://www.omdbapi.com/?apikey=${apiKey}&s=${encodeURIComponent(
      searchTerm,
    )}&page=${page}${type ? `&type=${type}` : ""}${year ? `&y=${year}` : ""}`;

    console.log("OMDb search URL:", searchUrl);
    const response = await axios.get(searchUrl);

    if (response.data.Response === "False") {
      return res.json({ totalResults: 0, page: Number(page), movies: [] });
    }

    let movies = response.data.Search.map((item) => ({
      _id: item.imdbID,
      title: item.Title,
      year: item.Year,
      poster: item.Poster,
      type: item.Type,
    }));

    // Filter by actor or genre if requested
    if (actor || genre) {
      const filtered = [];
      for (const movie of movies) {
        const detailRes = await axios.get(
          `https://www.omdbapi.com/?apikey=${apiKey}&i=${movie._id}`,
        );
        const data = detailRes.data;
        let matches = true;
        if (actor)
          matches =
            matches && data.Actors?.toLowerCase().includes(actor.toLowerCase());
        if (genre)
          matches =
            matches && data.Genre?.toLowerCase().includes(genre.toLowerCase());
        if (matches) filtered.push(movie);
      }
      movies = filtered;
    }

    res.json({
      totalResults: Number(response.data.totalResults),
      page: Number(page),
      movies,
    });
  } catch (err) {
    console.error("Advanced OMDb search error:", err.message);
    res.status(500).json({
      message: "Error performing advanced OMDb search",
      error: err.message,
    });
  }
});

module.exports = router;
