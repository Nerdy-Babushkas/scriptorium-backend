const express = require("express");
const router = express.Router();

const userRoutes = require("./user");
const bookRoutes = require("./books");
const musicRoutes = require("./music");
const reflectionRoutes = require("./reflections");

// Mount routes
router.use("/user", userRoutes);
router.use("/books", bookRoutes);
router.use("/music", musicRoutes);
router.use("/reflections", reflectionRoutes);

module.exports = router;
