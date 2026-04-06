const mongoose = require("mongoose");
const bookshelfSchema = require("./Bookshelf");
const musicShelfSchema = require("./MusicShelf");
const movieshelfSchema = require("./Movieshelf");

const userSchema = new mongoose.Schema(
  {
    userName: String,
    password: String,
    email: { type: String, unique: true },

    isVerified: { type: Boolean, default: false },
    verificationToken: String,
    verificationTokenExpires: Date,

    resetPasswordToken: String,
    resetPasswordExpires: Date,

    // ================= BOOK SHELVES =================
    bookshelves: {
      type: [bookshelfSchema],
      default: [
        { name: "wishlist", books: [] },
        { name: "reading", books: [] },
        { name: "finished", books: [] },
        { name: "favorites", books: [] },
      ],
    },

    // ================= MUSIC SHELVES =================
    musicShelves: {
      type: [musicShelfSchema],
      default: [
        { name: "listening", tracks: [] },
        { name: "finished", tracks: [] },
        { name: "favorites", tracks: [] },
      ],
    },

    // ================= MOVIE SHELVES =================
    movieshelves: {
      type: [movieshelfSchema],
      default: [
        { name: "watchlist", movies: [] },
        { name: "watching", movies: [] },
        { name: "watched", movies: [] },
        { name: "favorites", movies: [] },
      ],
    },

    // ================= AVATAR =================
    avatarKey: { type: String, default: "hatchling" },
    unlockedAvatars: { type: [String], default: ["hatchling"] },

    // ================= GAMIFICATION =================
    // Badges and streaks live in their own collections (Badge, Streak).
    // These counters here are cheap denormalised totals used only for badge
    // threshold checks — avoids COUNT queries on every media-save action.
    totalMediaSaved: { type: Number, default: 0 },
    totalGoalsCompleted: { type: Number, default: 0 },

    // Legacy fields kept for backwards compatibility — do not use in new code.
    points_balance: { type: Number, default: 0 },
    achievements: { type: [Object], default: [] },
    owned_rewards: { type: [Object], default: [] },
    rooms: { type: [Object], default: [] },
    media_placements: { type: [Object], default: [] },

    // ================= TIPS =================
    // IDs of tips the user has already dismissed.
    // Stored as strings so new tips can be added without migrations.
    seenTips: { type: [String], default: [] },
    tipsDisabled: { type: Boolean, default: false },

    last_login: Date,
    ai_info: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
