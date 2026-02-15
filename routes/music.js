// routes/music.js

const express = require("express");
const router = express.Router();
const axios = require("axios");

const { getUserFromToken } = require("../services/user-service");
const musicService = require("../services/music-service");

// ================= SEARCH MUSIC =================
router.get("/search", async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res
      .status(400)
      .json({ message: "Missing search query parameter 'q'" });
  }

  try {
    const url = `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(
      query,
    )}&fmt=json`;

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

// ================= ADD TRACK TO SHELF =================
router.post("/shelf/add", async (req, res) => {
  try {
    const user = getUserFromToken(req);

    const { trackId, shelf } = req.body;

    const result = await musicService.addTrackToShelf(user._id, trackId, shelf);

    res.json(result);
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

// ================= GET ALL USER SHELVES =================
module.exports = router;
