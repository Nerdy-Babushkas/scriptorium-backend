// tests/book-service.test.js
const bookService = require("../services/book-service");
const Book = require("../models/Book");
const User = require("../models/User");

jest.mock("../models/Book");
jest.mock("../models/User");

describe("Book Service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const bookData = { _id: "book1", title: "Test Book" };
  const userId = "user1";

  // ================= SAVE BOOK =================
  describe("saveBook", () => {
    it("returns existing book if already in DB", async () => {
      Book.findById.mockResolvedValue(bookData);

      const result = await bookService.saveBook(bookData);
      expect(result).toEqual(bookData);
    });

    it("saves new book if not in DB", async () => {
      Book.findById.mockResolvedValue(null);
      const mockSave = jest.fn().mockResolvedValue(bookData);
      Book.mockImplementation(() => ({ save: mockSave }));

      const result = await bookService.saveBook(bookData);
      expect(mockSave).toHaveBeenCalled();
      expect(result).toEqual(bookData);
    });
  });

  // ================= GET BOOK =================
  describe("getBookById", () => {
    it("returns the book if found", async () => {
      Book.findById.mockResolvedValue(bookData);
      const result = await bookService.getBookById("book1");
      expect(result).toEqual(bookData);
    });

    it("throws if book not found", async () => {
      Book.findById.mockResolvedValue(null);
      await expect(bookService.getBookById("book1")).rejects.toThrow(
        "Book not found",
      );
    });
  });

  // ================= GET MANY BOOKS =================
  describe("getBooksByIds", () => {
    it("returns multiple books", async () => {
      Book.find.mockResolvedValue([bookData]);
      const result = await bookService.getBooksByIds(["book1"]);
      expect(result).toEqual([bookData]);
    });
  });

  // ================= ADD BOOK TO SHELF =================
  describe("addBookToShelf", () => {
    it("adds book to existing shelf", async () => {
      const user = {
        bookshelves: [{ name: "favorites", books: [] }],
        save: jest.fn().mockResolvedValue(true),
      };
      User.findById.mockResolvedValue(user);

      const result = await bookService.addBookToShelf(
        userId,
        "book1",
        "favorites",
      );
      expect(result).toEqual({ message: "Book added to favorites" });
      expect(user.bookshelves[0].books).toContain("book1");
      expect(user.save).toHaveBeenCalled();
    });

    it("creates shelf if missing", async () => {
      const user = { bookshelves: [], save: jest.fn().mockResolvedValue(true) };
      User.findById.mockResolvedValue(user);

      const result = await bookService.addBookToShelf(
        userId,
        "book1",
        "reading",
      );
      expect(result).toEqual({ message: "Book added to reading" });
      expect(user.bookshelves[0].name).toBe("reading");
      expect(user.save).toHaveBeenCalled();
    });

    it("throws if shelf name invalid", async () => {
      await expect(
        bookService.addBookToShelf(userId, "book1", "invalid"),
      ).rejects.toThrow("Invalid shelf name");
    });
  });

  // ================= GET USER SHELF =================
  describe("getUserShelf", () => {
    it("returns books from shelf", async () => {
      const user = {
        bookshelves: [{ name: "favorites", books: ["book1"] }],
      };
      User.findById.mockResolvedValue(user);
      Book.find.mockResolvedValue([bookData]); // mock getBooksByIds internally

      const result = await bookService.getUserShelf(userId, "favorites");
      expect(result).toEqual([bookData]);
    });

    it("returns empty array if shelf missing", async () => {
      const user = { bookshelves: [] };
      User.findById.mockResolvedValue(user);

      const result = await bookService.getUserShelf(userId, "favorites");
      expect(result).toEqual([]);
    });

    it("throws if shelf name invalid", async () => {
      await expect(bookService.getUserShelf(userId, "invalid")).rejects.toThrow(
        "Invalid shelf name",
      );
    });
  });

  // ================= GET ALL USER SHELVES =================
  describe("getAllUserShelves", () => {
    it("returns all shelves with books", async () => {
      const user = {
        bookshelves: [
          { name: "favorites", books: ["book1"] },
          { name: "reading", books: [] },
        ],
      };
      User.findById.mockResolvedValue(user);

      // Smart mock for Book.find that respects IDs
      Book.find.mockImplementation(({ _id: { $in } }) => {
        const results = [];
        if ($in.includes("book1")) results.push(bookData);
        return Promise.resolve(results);
      });

      const result = await bookService.getAllUserShelves(userId);
      expect(result.favorites).toEqual([bookData]);
      expect(result.reading).toEqual([]);
      expect(result.wishlist).toEqual([]);
      expect(result.finished).toEqual([]);
    });
  });

  // ================= REMOVE BOOK FROM SHELF =================
  describe("removeBookFromShelf", () => {
    it("removes book if present", async () => {
      const user = {
        bookshelves: [{ name: "favorites", books: ["book1"] }],
        save: jest.fn().mockResolvedValue(true),
      };
      User.findById.mockResolvedValue(user);

      const result = await bookService.removeBookFromShelf(
        userId,
        "book1",
        "favorites",
      );
      expect(result).toEqual({ message: "Book removed from favorites" });
      expect(user.bookshelves[0].books).toHaveLength(0);
      expect(user.save).toHaveBeenCalled();
    });

    it("returns message if book not in shelf", async () => {
      const user = {
        bookshelves: [{ name: "favorites", books: [] }],
        save: jest.fn().mockResolvedValue(true),
      };
      User.findById.mockResolvedValue(user);

      const result = await bookService.removeBookFromShelf(
        userId,
        "book1",
        "favorites",
      );
      expect(result).toEqual({ message: "Book was not in shelf" });
    });

    it("throws if shelf name invalid", async () => {
      await expect(
        bookService.removeBookFromShelf(userId, "book1", "invalid"),
      ).rejects.toThrow("Invalid shelf name");
    });
  });
});
