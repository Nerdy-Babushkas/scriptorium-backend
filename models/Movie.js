const mongoose = require("mongoose");

const movieSchema = new mongoose.Schema(
  {
    // Use IMDb ID as primary key
    _id: {
      type: String, // imdbID
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    year: String,
    rated: String,
    released: String,
    runtime: String,

    genres: {
      type: [String],
      default: [],
    },

    director: String,

    writers: {
      type: [String],
      default: [],
    },

    actors: {
      type: [String],
      default: [],
    },

    plot: String,
    language: String,
    country: String,
    awards: String,

    poster: String,

    ratings: [
      {
        source: String,
        value: String,
      },
    ],

    metascore: Number,
    imdbRating: Number,
    imdbVotes: Number,

    boxOffice: String,
    production: String,
  },
  { timestamps: true },
);

// Text search index (like Book)
movieSchema.index({ title: "text", actors: "text", genres: "text" });

// Helpful secondary indexes
movieSchema.index({ actors: 1 });
movieSchema.index({ genres: 1 });

module.exports = mongoose.model("Movie", movieSchema);
