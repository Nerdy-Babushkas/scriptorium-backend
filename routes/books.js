//scriptorium-backend/routes/books.js

const express = require("express");
const router = express.Router();
const axios = require("axios");
const jwt = require("jsonwebtoken");
const { getUserFromToken } = require("../services/user-service");

const booksService = require("../services/book-service");

// ================= Search Google Books (UNCHANGED) =================
router.get("/search", async (req, res) => {
  const { q, page = 1, limit = 20 } = req.query;

  if (!q) {
    return res
      .status(400)
      .json({ message: "Missing search query parameter 'q'" });
  }

  try {
    const apiKey = process.env.BOOKS_API;

    const currentPage = Number(page);
    const pageLimit = Math.min(Number(limit), 40);
    const startIndex = (currentPage - 1) * pageLimit;

    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
      q,
    )}&maxResults=${pageLimit}&startIndex=${startIndex}&key=${apiKey}`;

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

    res.json({
      totalResults: response.data.totalItems || 0,
      page: currentPage,
      books,
    });
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

// ================= ADVANCED SEARCH =================
router.get("/advanced/search", async (req, res) => {
  try {
    const {
      q,
      title,
      author,
      category,
      publisher,
      page = 1,
      limit = 20,
      orderBy = "relevance",
    } = req.query;

    const apiKey = process.env.BOOKS_API;

    const queryParts = [];

    if (q) queryParts.push(q);
    if (title) queryParts.push(`intitle:${title}`);
    if (author) queryParts.push(`inauthor:${author}`);
    if (category) queryParts.push(`subject:${category}`);
    if (publisher) queryParts.push(`inpublisher:${publisher}`);

    if (queryParts.length === 0) {
      return res.status(400).json({
        message: "Provide at least one search parameter",
      });
    }

    const startIndex = (page - 1) * limit;

    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
      queryParts.join(" "),
    )}&maxResults=${limit}&startIndex=${startIndex}&orderBy=${orderBy}&key=${apiKey}`;

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

    res.json({
      totalResults: response.data.totalItems || 0,
      page: Number(page),
      books,
    });
  } catch (err) {
    console.error("Advanced Google Books search error:", err.message);

    res.status(500).json({
      message: "Error performing advanced Google Books search",
    });
  }
});

module.exports = router;
