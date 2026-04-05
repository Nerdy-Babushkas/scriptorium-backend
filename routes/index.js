// routes/index.js

const express = require("express");
const router = express.Router();

const userRoutes = require("./user");
const bookRoutes = require("./books");
const musicRoutes = require("./music");
const reflectionRoutes = require("./reflections");
const goalRoutes = require("./goals");
const movieRoutes = require("./movies");
const recommendationsRoutes = require("./recommendations");
const streakRoutes = require("./streaks");
const badgesRoutes = require("./badges");

// Mount routes
router.use("/user", userRoutes);
router.use("/books", bookRoutes);
router.use("/music", musicRoutes);
router.use("/goals", goalRoutes);
router.use("/reflection", reflectionRoutes);
router.use("/movies", movieRoutes);
router.use("/recommendations", recommendationsRoutes);
router.use("/streaks", streakRoutes);
router.use("/badges", badgesRoutes);

module.exports = router;
