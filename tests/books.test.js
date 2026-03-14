const request = require("supertest");
const express = require("express");

const booksRouter = require("../routes/books");

jest.mock("axios");
jest.mock("../services/book-service");
jest.mock("../services/user-service");

const axios = require("axios");
const booksService = require("../services/book-service");
const { getUserFromToken } = require("../services/user-service");

const app = express();
app.use(express.json());
app.use("/api/books", booksRouter);

beforeEach(() => {
  jest.clearAllMocks();
});

test("GET /api/books/search returns books from Google Books", async () => {
  axios.get.mockResolvedValue({
    data: {
      items: [
        {
          id: "book123",
          volumeInfo: {
            title: "Test Book",
            authors: ["Author"],
            publisher: "Test Publisher",
          },
        },
      ],
    },
  });

  const response = await request(app).get("/api/books/search?q=test");

  expect(response.statusCode).toBe(200);
  expect(response.body.books.length).toBe(1);
  expect(response.body.books[0].title).toBe("Test Book");
});

test("GET /api/books/search without query returns 400", async () => {
  const response = await request(app).get("/api/books/search");

  expect(response.statusCode).toBe(400);
});

test("POST /api/books saves book", async () => {
  booksService.saveBook.mockResolvedValue({
    _id: "book123",
    title: "Test Book",
  });

  const response = await request(app).post("/api/books").send({
    _id: "book123",
    title: "Test Book",
  });

  expect(response.statusCode).toBe(200);
  expect(response.body.title).toBe("Test Book");
});

test("GET /api/books/shelf returns user shelves", async () => {
  getUserFromToken.mockReturnValue({ _id: "user1" });

  booksService.getAllUserShelves.mockResolvedValue({
    reading: [],
    finished: [],
  });

  const response = await request(app).get("/api/books/shelf");

  expect(response.statusCode).toBe(200);
  expect(booksService.getAllUserShelves).toHaveBeenCalledWith("user1");
});

test("GET /api/books/shelf/:shelf returns books", async () => {
  getUserFromToken.mockReturnValue({ _id: "user1" });

  booksService.getUserShelf.mockResolvedValue([{ title: "Book A" }]);

  const response = await request(app).get("/api/books/shelf/reading");

  expect(response.statusCode).toBe(200);
  expect(response.body.length).toBe(1);
});

test("GET /api/books/:id returns book", async () => {
  booksService.getBookById.mockResolvedValue({
    _id: "book123",
    title: "Test Book",
  });

  const response = await request(app).get("/api/books/book123");

  expect(response.statusCode).toBe(200);
  expect(response.body._id).toBe("book123");
});

test("POST /api/books/shelf/add adds book to shelf", async () => {
  getUserFromToken.mockReturnValue({ _id: "user1" });

  booksService.getBookById.mockResolvedValue({
    _id: "book123",
    title: "Book",
  });

  booksService.addBookToShelf.mockResolvedValue({
    message: "Book added",
  });

  const response = await request(app).post("/api/books/shelf/add").send({
    shelf: "reading",
    _id: "book123",
    title: "Book",
  });

  expect(response.statusCode).toBe(200);
  expect(response.body.message).toBe("Book added");
});

test("POST /api/books/shelf/add fails if shelf missing", async () => {
  const response = await request(app).post("/api/books/shelf/add").send({
    _id: "book123",
    title: "Book",
  });

  expect(response.statusCode).toBe(400);
});

test("POST /api/books/shelf/remove removes book", async () => {
  getUserFromToken.mockReturnValue({ _id: "user1" });

  booksService.removeBookFromShelf.mockResolvedValue({
    message: "Book removed",
  });

  const response = await request(app).post("/api/books/shelf/remove").send({
    bookId: "book123",
    shelf: "reading",
  });

  expect(response.statusCode).toBe(200);
  expect(response.body.message).toBe("Book removed");
});

test("POST /api/books/shelf/remove fails if parameters missing", async () => {
  const response = await request(app).post("/api/books/shelf/remove").send({
    bookId: "book123",
  });

  expect(response.statusCode).toBe(400);
});

test("GET /api/books/advanced/search returns books from Google Books", async () => {
  axios.get.mockResolvedValue({
    data: {
      totalItems: 1,
      items: [
        {
          id: "book456",
          volumeInfo: {
            title: "Advanced Book",
            authors: ["Advanced Author"],
            publisher: "Advanced Publisher",
          },
        },
      ],
    },
  });

  const response = await request(app).get(
    "/api/books/advanced/search?author=Author",
  );

  expect(response.statusCode).toBe(200);
  expect(response.body.books.length).toBe(1);
  expect(response.body.books[0].title).toBe("Advanced Book");

  expect(axios.get).toHaveBeenCalled();
});

test("GET /api/books/advanced/search fails if no parameters provided", async () => {
  const response = await request(app).get("/api/books/advanced/search");

  expect(response.statusCode).toBe(400);
});

test("GET /api/books/advanced/search handles Google API failure", async () => {
  const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

  axios.get.mockRejectedValue(new Error("Google API failure"));

  const response = await request(app).get(
    "/api/books/advanced/search?q=history",
  );

  expect(response.statusCode).toBe(500);
  expect(response.body.message).toBe(
    "Error performing advanced Google Books search",
  );

  consoleSpy.mockRestore();
});
