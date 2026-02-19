const express = require("express");
const router = express.Router();

const userRoutes = require("./user");
const bookRoutes = require("./books");
const musicRoutes = require("./music");
const reflectionRoutes = require("./reflections");
const goalRoutes = require("./goals");
const goalsNoAuthRoutes = require("./goals-noauth");
const movieRoutes = require("./movies");

// Mount routes
router.use("/user", userRoutes);
router.use("/books", bookRoutes);
router.use("/music", musicRoutes);
router.use("/goals", goalRoutes);
router.use("/goals/noauth", goalsNoAuthRoutes);
router.use("/reflection", reflectionRoutes);
router.use("/movies", movieRoutes);

module.exports = router;
