// models/Music.js

const mongoose = require("mongoose");

const musicSchema = new mongoose.Schema(
  {
    _id: {
      type: String, // MusicBrainz Recording MBID
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    artist: {
      name: String,
      mbid: String,
    },

    release: {
      title: String,
      mbid: String,
      date: String,
    },

    duration: Number, // milliseconds

    genres: {
      type: [String],
      default: [],
    },

    coverUrl: String,
  },
  { timestamps: true },
);

musicSchema.index({ title: "text", "artist.name": "text" });

module.exports = mongoose.model("Music", musicSchema);
