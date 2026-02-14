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
  if (!["favorites", "wishlist"].includes(shelfName)) {
    throw new Error("Invalid shelf name");
  }

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const shelf = user.bookshelves.find((s) => s.name === shelfName);
  if (!shelf) throw new Error("Shelf not found");

  if (!shelf.books.includes(bookId)) {
    shelf.books.push(bookId);
    await user.save();
  }

  return { message: `Book added to ${shelfName}` };
}

// ================= GET SPECIFIC USER SHELF =================
async function getUserShelf(userId, shelfName) {
  if (!["favorites", "wishlist"].includes(shelfName)) {
    throw new Error("Invalid shelf name");
  }

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const shelf = user.bookshelves.find((s) => s.name === shelfName);
  if (!shelf) throw new Error("Shelf not found");

  return await getBooksByIds(shelf.books);
}

// ================= GET ALL USER SHELVES =================
async function getAllUserShelves(userId) {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const favoritesShelf = user.bookshelves.find((s) => s.name === "favorites");
  const wishlistShelf = user.bookshelves.find((s) => s.name === "wishlist");

  const favorites = await getBooksByIds(favoritesShelf?.books || []);
  const wishlist = await getBooksByIds(wishlistShelf?.books || []);

  return { favorites, wishlist };
}

// ================= REMOVE BOOK FROM USER SHELF =================
async function removeBookFromShelf(userId, bookId, shelfName) {
  if (!["favorites", "wishlist"].includes(shelfName)) {
    throw new Error("Invalid shelf name");
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
