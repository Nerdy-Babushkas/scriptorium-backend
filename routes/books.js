// routes/books.js
const express = require("express");
const router = express.Router();
const axios = require("axios");
const Book = require("../models/Book.js");

// ================= Search Google Books (single string) =================
router.get("/search", async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res
      .status(400)
      .json({ message: "Missing search query parameter 'q'" });
  }

  try {
    const apiKey = process.env.BOOKS_API;
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
      query,
    )}&maxResults=20&key=${apiKey}`;

    const response = await axios.get(url);

    // Map results to only the fields we care about
    const books =
      response.data.items?.map((item) => {
        const info = item.volumeInfo;
        return {
          _id: item.id,
          title: info.title,
          subtitle: info.subtitle,
          authors: info.authors || [],
          publisher: info.publisher,
          publishedDate: info.publishedDate,
          description: info.description,
          pageCount: info.pageCount,
          averageRating: info.averageRating,
          ratingsCount: info.ratingsCount,
          categories: info.categories || [],
          imageLinks: info.imageLinks || {},
        };
      }) || [];

    res.json({ books });
  } catch (err) {
    console.error("Google Books API error:", err.message);
    res
      .status(500)
      .json({ message: "Error fetching books from Google Books API" });
  }
});

module.exports = router;
