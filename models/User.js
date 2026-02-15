// models/User.js

const mongoose = require("mongoose");
const bookshelfSchema = require("./Bookshelf");
const musicShelfSchema = require("./MusicShelf");

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

    bookshelves: {
      type: [bookshelfSchema],
      default: [
        { name: "favorites", books: [] },
        { name: "wishlist", books: [] },
      ],
    },

    musicShelves: {
      type: [musicShelfSchema],
      default: [
        { name: "favorites", tracks: [] },
        { name: "wishlist", tracks: [] },
      ],
    },

    points_balance: { type: Number, default: 0 },
    reflections: { type: [Object], default: [] },
    goals: { type: [Object], default: [] },
    achievements: { type: [Object], default: [] },
    owned_rewards: { type: [Object], default: [] },
    rooms: { type: [Object], default: [] },
    media_placements: { type: [Object], default: [] },
    last_login: Date,
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
