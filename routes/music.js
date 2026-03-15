// routes/music.js

const express = require("express");
const router = express.Router();
const axios = require("axios");

const { getUserFromToken } = require("../services/user-service");
const musicService = require("../services/music-service");

// ================= SEARCH MUSIC =================
router.get("/search", async (req, res) => {
  const { q, page = 1, limit = 20 } = req.query;

  if (!q) {
    return res
      .status(400)
      .json({ message: "Missing search query parameter 'q'" });
  }

  try {
    const currentPage = Number(page);
    const pageLimit = Number(limit);
    const offset = (currentPage - 1) * pageLimit;
    const url = `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(
      q,
    )}&fmt=json&limit=${pageLimit}&offset=${offset}`;

    const response = await axios.get(url, {
      headers: {
        "User-Agent": "ScriptoriumApp/1.0 ( babushkas.prj@gmail.com )",
      },
    });

    const tracks =
      response.data.recordings?.map((item) => ({
        _id: item.id,
        title: item.title,
        artist: {
          name: item["artist-credit"]?.[0]?.name || "Unknown",
          mbid: item["artist-credit"]?.[0]?.artist?.id,
        },
        release: {
          title: item.releases?.[0]?.title,
          mbid: item.releases?.[0]?.id,
          date: item.releases?.[0]?.date,
        },
        duration: item.length,
      })) || [];

    res.json({ tracks });
  } catch (err) {
    console.error("MusicBrainz API error:", err.message);
    res.status(500).json({ message: "Error fetching music from MusicBrainz" });
  }
});

// ================= SAVE TRACK =================
router.post("/", async (req, res) => {
  try {
    const track = await musicService.saveTrack(req.body);
    res.json(track);
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
});

router.get("/shelf/:shelfName", async (req, res) => {
  try {
    const user = getUserFromToken(req);
    const shelfName = req.params.shelfName;

    const tracks = await musicService.getUserShelf(user._id, shelfName);
    res.json(tracks);
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
});

router.get("/shelf", async (req, res) => {
  try {
    const user = getUserFromToken(req);

    const shelves = await musicService.getAllUserShelves(user._id);
    res.json(shelves);
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
});

// ================= GET TRACK =================
router.get("/:id", async (req, res) => {
  try {
    const track = await musicService.getTrackById(req.params.id);
    res.json(track);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
});

// ================= ADD TRACK TO USER SHELF =================
router.post("/shelf/add", async (req, res) => {
  try {
    const user = getUserFromToken(req);
    const { shelf, ...trackData } = req.body;

    // Validate shelf
    if (!shelf) {
      return res.status(400).json({ message: "Shelf is required" });
    }

    // Validate minimum required track data
    if (!trackData._id || !trackData.title) {
      return res.status(400).json({
        message: "Track must include at least _id (Spotify ID) and title",
      });
    }

    // CHECK IF TRACK ALREADY EXISTS (avoid duplicates)
    let track = await musicService
      .getTrackById(trackData._id)
      .catch(() => null);

    if (!track) {
      track = await musicService.saveTrack(trackData);
    }

    // ADD TRACK TO USER SHELF
    const result = await musicService.addTrackToShelf(
      user._id,
      track._id,
      shelf,
    );

    res.json({
      message: result.message,
      shelf,
      track,
    });
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
});

// ================= REMOVE TRACK FROM SHELF =================
router.post("/shelf/remove", async (req, res) => {
  try {
    const user = getUserFromToken(req);
    const { trackId, shelf } = req.body;

    const result = await musicService.removeTrackFromShelf(
      user._id,
      trackId,
      shelf,
    );

    res.json(result);
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
});

// ================= ADVANCED MUSIC SEARCH =================
router.get("/advanced/search", async (req, res) => {
  try {
    const { q, title, artist, release, year, page = 1, limit = 25 } = req.query;

    const queryParts = [];

    if (q) queryParts.push(q);
    if (title) queryParts.push(`recording:${title}`);
    if (artist) queryParts.push(`artist:${artist}`);
    if (release) queryParts.push(`release:${release}`);
    if (year) queryParts.push(`date:${year}`);

    if (queryParts.length === 0) {
      return res.status(400).json({
        message: "Provide at least one search parameter",
      });
    }

    const offset = (page - 1) * limit;

    const url = `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(
      queryParts.join(" "),
    )}&fmt=json&limit=${limit}&offset=${offset}`;

    const response = await axios.get(url, {
      headers: {
        "User-Agent": "ScriptoriumApp/1.0 ( babushkas.prj@gmail.com )",
      },
    });

    const tracks =
      response.data.recordings?.map((item) => ({
        _id: item.id,
        title: item.title,
        artist: {
          name: item["artist-credit"]?.[0]?.name || "Unknown",
          mbid: item["artist-credit"]?.[0]?.artist?.id,
        },
        release: {
          title: item.releases?.[0]?.title,
          mbid: item.releases?.[0]?.id,
          date: item.releases?.[0]?.date,
        },
        duration: item.length,
      })) || [];

    res.json({
      totalResults: response.data.count || 0,
      page: Number(page),
      tracks,
    });
  } catch (err) {
    console.error("Advanced MusicBrainz search error:", err.message);

    res.status(500).json({
      message: "Error performing advanced MusicBrainz search",
    });
  }
});

// ================= GET ALL USER SHELVES =================
module.exports = router;
