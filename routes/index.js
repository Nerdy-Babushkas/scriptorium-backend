const express = require("express");
const router = express.Router();

const userRoutes = require("./user");
const bookRoutes = require("./books");

// Mount routes
router.use("/user", userRoutes);
router.use("/books", bookRoutes);

module.exports = router;
