// routes/reflection.js
const express = require("express");
const router = express.Router();
const { getUserFromToken } = require("../services/user-service");
const reflectionService = require("../services/reflection-service");

// ================= ADD REFLECTION =================
router.post("/add", async (req, res) => {
  try {
    const user = getUserFromToken(req);

    const {
      itemId,
      itemType,
      text,
      moodTags = [],
      feelings = [],
      progress,
      metadata = {},
      date = new Date(),
    } = req.body;

    if (!itemId || !itemType || !text) {
      return res.status(400).json({
        message: "itemId, itemType, and text are required",
      });
    }

    if (text.length < 30 || text.length > 2000) {
      return res.status(400).json({
        message: "Reflection text must be between 30 and 2000 characters",
      });
    }

    console.log("Creating reflection...");
    const reflection = await reflectionService.createReflection({
      user: user._id,
      item: itemId,
      itemType,
      text,
      moodTags,
      feelings,
      progress,
      metadata,
      date,
    });

    res.json({
      message: "Reflection added successfully",
      reflection,
    });
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
});

// ================= GET ALL USER REFLECTIONS =================
router.get("/user", async (req, res) => {
  try {
    const user = getUserFromToken(req);
    const reflections = await reflectionService.getUserReflections(user._id);
    res.json(reflections);
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
});

// ================= GET REFLECTIONS FOR ITEM =================
router.get("/item/:itemId", async (req, res) => {
  try {
    const { itemId } = req.params;
    const { itemType } = req.query;

    if (!itemType) {
      return res.status(400).json({ message: "itemType is required" });
    }

    const reflections = await reflectionService.getReflectionsByItem(
      itemId,
      itemType,
    );
    res.json(reflections);
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
});

// ================= GET SPECIFIC REFLECTION =================
router.get("/:id", async (req, res) => {
  try {
    const reflection = await reflectionService.getReflectionById(req.params.id);
    res.json(reflection);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
});

// ================= UPDATE REFLECTION =================
router.put("/update/:id", async (req, res) => {
  try {
    const updates = req.body;
    const reflection = await reflectionService.updateReflection(
      req.params.id,
      updates,
    );
    res.json({
      message: "Reflection updated successfully",
      reflection,
    });
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
});

// ================= REMOVE REFLECTION =================
router.delete("/remove/:id", async (req, res) => {
  try {
    const result = await reflectionService.removeReflection(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
});

module.exports = router;
