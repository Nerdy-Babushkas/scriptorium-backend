const express = require("express");
const router = express.Router();
const { sendFeedbackEmail } = require("../services/email-service");

router.post("/", async (req, res) => {
  const { name, email, area, description } = req.body;

  if (!description || !description.trim()) {
    return res.status(400).json({ error: "Description is required." });
  }

  if (!area || !area.trim()) {
    return res.status(400).json({ error: "Please select an area." });
  }

  try {
    await sendFeedbackEmail({ name, email, area, description });
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Feedback email error:", err);
    return res.status(500).json({ error: "Failed to send feedback. Please try again." });
  }
});

module.exports = router;