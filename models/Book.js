//scriptorium-backend/models/Book.js

const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema(
  {
    // Use Google Books ID as primary key
    _id: {
      type: String, // Google volumeId
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },
    subtitle: String,

    authors: {
      type: [String],
      default: [],
    },

    publisher: String,
    publishedDate: String, // Google gives partial dates sometimes (YYYY or YYYY-MM)
    description: String,
    pageCount: Number,
    averageRating: Number,
    ratingsCount: Number,

    categories: {
      type: [String],
      default: [],
    },

    imageLinks: {
      thumbnail: String,
      smallThumbnail: String,
    },
  },
  { timestamps: true },
);

bookSchema.index({ title: "text", authors: "text", categories: "text" });
bookSchema.index({ authors: 1 });
bookSchema.index({ categories: 1 });

module.exports = mongoose.model("Book", bookSchema);
