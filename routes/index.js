const express = require("express");
const router = express.Router();

const userRoutes = require("./user");
const bookRoutes = require("./books");
const musicRoutes = require("./music");
const reflectionRoutes = require("./reflections");
const goalRoutes = require("./goals");

// Mount routes
router.use("/user", userRoutes);
router.use("/books", bookRoutes);
router.use("/music", musicRoutes);
router.use("/reflections", reflectionRoutes);
router.use("/goals", goalRoutes);


module.exports = router;
