const mongoose = require("mongoose");

// Every badge a user has ever earned — one document per award event.
// The badge "catalogue" (what each key means, its icon, description) lives
// in badge-service.js so we don't need a separate collection for it.

const badgeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Stable string key — used to look up display info in the catalogue.
    // e.g. "first_reflection", "streak_7", "media_50", "goal_complete"
    key: {
      type: String,
      required: true,
    },

    // Human-readable snapshot at time of earning (denormalised for speed)
    name: { type: String, required: true },
    description: { type: String, default: "" },
    icon: { type: String, default: "🏅" },

    // Category for grouping on the frontend
    // "streak" | "reflection" | "media" | "goal" | "milestone" | "seasonal"
    category: {
      type: String,
      enum: ["streak", "reflection", "media", "goal", "milestone", "seasonal"],
      required: true,
    },

    earnedAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

// A user can only earn each badge once
badgeSchema.index({ user: 1, key: 1 }, { unique: true });

module.exports = mongoose.model("Badge", badgeSchema);
