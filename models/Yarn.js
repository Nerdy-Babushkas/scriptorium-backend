// models/Yarn.js
const mongoose = require("mongoose");

const yarnSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one doc per user
    },

    // Spendable balance — decremented when the shop is implemented
    balance: { type: Number, default: 0, min: 0 },

    // Running total of everything ever earned — never decremented
    // Useful for lifetime stats / leaderboards without summing history
    lifetimeEarned: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Yarn", yarnSchema);
