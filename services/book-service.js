// services/book-service.js
const Book = require("../models/Book");
const User = require("../models/User");

// ================= SAVE BOOK =================
async function saveBook(bookData) {
  const existing = await Book.findById(bookData._id);

  if (existing) return existing; // avoid duplicates

  const book = new Book(bookData);
  return await book.save();
}

// ================= GET BOOK =================
async function getBookById(bookId) {
  const book = await Book.findById(bookId);
  if (!book) throw new Error("Book not found");
  return book;
}

// ================= GET MANY BOOKS =================
async function getBooksByIds(bookIds) {
  return await Book.find({ _id: { $in: bookIds } });
}

// ================= ADD BOOK TO USER SHELF =================
async function addBookToShelf(userId, bookId, shelfName) {
  // 1. Allow all 4 shelf types
  const ALLOWED_SHELVES = ["favorites", "wishlist", "reading", "finished"];
  
  if (!ALLOWED_SHELVES.includes(shelfName)) {
    throw new Error(`Invalid shelf name. Allowed: ${ALLOWED_SHELVES.join(', ')}`);
  }

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  // 2. Find shelf OR create it if it doesn't exist
  let shelf = user.bookshelves.find((s) => s.name === shelfName);
  
  if (!shelf) {
      // Create the missing shelf dynamically
      shelf = { name: shelfName, books: [] };
      user.bookshelves.push(shelf);
  }

  // 3. Add book if not present
  if (!shelf.books.includes(bookId)) {
    shelf.books.push(bookId);
    await user.save();
  }

  return { message: `Book added to ${shelfName}` };
}

// ================= GET SPECIFIC USER SHELF =================
async function getUserShelf(userId, shelfName) {
  const ALLOWED_SHELVES = ["favorites", "wishlist", "reading", "finished"];

  if (!ALLOWED_SHELVES.includes(shelfName)) {
    throw new Error("Invalid shelf name");
  }

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const shelf = user.bookshelves.find((s) => s.name === shelfName);
  
  // Return empty list if shelf doesn't exist yet (instead of crashing)
  if (!shelf) return []; 

  return await getBooksByIds(shelf.books);
}

// ================= GET ALL USER SHELVES =================
async function getAllUserShelves(userId) {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  // Helper to fetch books for a shelf, returns empty array if shelf doesn't exist
  const getShelfBooks = async (shelfName) => {
    const shelf = user.bookshelves.find((s) => s.name === shelfName);
    return await getBooksByIds(shelf?.books || []);
  };

  return {
    favorites: await getShelfBooks("favorites"),
    wishlist: await getShelfBooks("wishlist"),
    reading: await getShelfBooks("reading"),
    finished: await getShelfBooks("finished"),
  };
}

// ================= REMOVE BOOK FROM USER SHELF =================
async function removeBookFromShelf(userId, bookId, shelfName) {
  // FIX: Updated list to include 'reading' and 'finished'
  const ALLOWED_SHELVES = ["favorites", "wishlist", "reading", "finished"];

  if (!ALLOWED_SHELVES.includes(shelfName)) {
    throw new Error(`Invalid shelf name. Allowed: ${ALLOWED_SHELVES.join(', ')}`);
  }

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const shelf = user.bookshelves.find((s) => s.name === shelfName);
  if (!shelf) throw new Error("Shelf not found");

  const originalLength = shelf.books.length;

  // Remove book
  shelf.books = shelf.books.filter((id) => id.toString() !== bookId.toString());

  if (shelf.books.length === originalLength) {
    return { message: "Book was not in shelf" };
  }

  await user.save();
  return { message: `Book removed from ${shelfName}` };
}

module.exports = {
  saveBook,
  getBookById,
  getBooksByIds,
  addBookToShelf,
  getUserShelf,
  getAllUserShelves,
  removeBookFromShelf,
};
