// models/Bookshelf.js

const mongoose = require("mongoose");
require("./Book.js");

const bookshelfSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  books: [
    {
      type: String,
    },
  ],
});

module.exports = bookshelfSchema;
