const mongoose = require("mongoose");
require("./Music.js");

const musicShelfSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  tracks: [
    {
      type: String, // MusicBrainz Recording MBID
    },
  ],
});

module.exports = musicShelfSchema;
