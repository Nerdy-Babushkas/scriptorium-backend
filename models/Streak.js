const mongoose = require("mongoose");

// One document per user — updated on every activity event.
const streakSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    current: { type: Number, default: 0 }, // consecutive active days right now
    longest: { type: Number, default: 0 }, // all-time personal best

    // The calendar date (midnight UTC) of the last day the user was active.
    // Stored as a Date so we can do clean day-diff arithmetic.
    lastActiveDate: { type: Date, default: null },

    // Grace days earned but not yet spent.
    // A user earns 1 grace day per completed 7-day streak block.
    graceDaysAvailable: { type: Number, default: 0 },

    // Running count of total active days ever (for milestone badges)
    totalActiveDays: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Streak", streakSchema);
