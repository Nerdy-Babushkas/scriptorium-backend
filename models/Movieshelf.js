const mongoose = require("mongoose");
require("./Movie.js");

const movieshelfSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  movies: [
    {
      type: String, // imdbID
    },
  ],
});

module.exports = movieshelfSchema;
