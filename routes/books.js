const express = require("express");
const router = express.Router();
const axios = require("axios");
const jwt = require("jsonwebtoken");
const { getUserFromToken } = require("../services/user-service");

const booksService = require("../services/book-service");

// ================= Search Google Books (UNCHANGED) =================
router.get("/search", async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res
      .status(400)
      .json({ message: "Missing search query parameter 'q'" });
  }

  try {
    const apiKey = process.env.BOOKS_API;
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=20&key=${apiKey}`;

    const response = await axios.get(url);

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

// =====================================================
// ================= SAVE BOOK =================
// =====================================================
router.post("/", async (req, res) => {
  try {
    const book = await booksService.saveBook(req.body);
    res.json(book);
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
});

// ================= GET BOOK =================
router.get("/:id", async (req, res) => {
  try {
    const book = await booksService.getBookById(req.params.id);
    res.json(book);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
});

// ================= ADD BOOK TO USER SHELF =================
router.post("/shelf/add", async (req, res) => {
  try {
    const user = getUserFromToken(req);
    const { shelf, ...bookData } = req.body;

    if (!shelf) {
      return res.status(400).json({ message: "Shelf is required" });
    }

    if (!bookData._id || !bookData.title) {
      return res.status(400).json({
        message: "Book must include at least _id (Google ID) and title",
      });
    }

    // 1. CHECK IF BOOK ALREADY EXISTS (avoid duplicates)
    let book = await booksService.getBookById(bookData._id).catch(() => null);

    if (!book) {
      book = await booksService.saveBook(bookData);
    }

    // 2. ADD BOOK TO USER SHELF (using book._id string)
    const result = await booksService.addBookToShelf(user._id, book._id, shelf);

    res.json({
      message: result.message,
      shelf,
      book,
    });
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
});

// ================= REMOVE BOOK FROM USER SHELF =================
router.post("/shelf/remove", async (req, res) => {
  try {
    const user = getUserFromToken(req);
    const { bookId, shelf } = req.body;

    const result = await booksService.removeBookFromShelf(
      user._id,
      bookId,
      shelf,
    );
    res.json(result);
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
});

// ================= GET ALL USER SHELVES =================
router.get("/shelf", async (req, res) => {
  try {
    const user = getUserFromToken(req);

    const shelves = await booksService.getAllUserShelves(user._id);
    res.json(shelves);
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
});

// ================= GET SPECIFIC USER SHELF =================
router.get("/shelf/:shelf", async (req, res) => {
  try {
    const user = getUserFromToken(req);
    const shelf = req.params.shelf;

    const books = await booksService.getUserShelf(user._id, shelf);
    res.json(books);
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
});

// ================= REMOVE BOOK FROM USER SHELF =================
router.post("/shelf/remove", async (req, res) => {
  try {
    const user = getUserFromToken(req);

    const { bookId, shelf } = req.body;

    if (!bookId || !shelf) {
      return res.status(400).json({
        message: "bookId and shelf are required",
      });
    }

    const result = await booksService.removeBookFromShelf(
      user._id,
      bookId,
      shelf,
    );

    res.json(result);
  } catch (err) {
    console.error("Remove shelf error:", err.message);
    res.status(401).json({ message: err.message });
  }
});

module.exports = router;
