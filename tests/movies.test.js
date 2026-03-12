const request = require("supertest");
const express = require("express");

const movieRouter = require("../routes/movies");

jest.mock("axios");
jest.mock("../services/movie-service");
jest.mock("../services/user-service");

const axios = require("axios");
const movieService = require("../services/movie-service");
const { getUserFromToken } = require("../services/user-service");

const app = express();
app.use(express.json());
app.use("/api/movie", movieRouter);

beforeEach(() => {
  jest.clearAllMocks();
});

test("GET /api/movie/search returns movies from OMDb", async () => {
  axios.get.mockResolvedValue({
    data: {
      Response: "True",
      Search: [
        {
          imdbID: "tt123",
          Title: "Test Movie",
          Year: "2024",
          Poster: "poster.jpg",
          Type: "movie",
        },
      ],
    },
  });

  const response = await request(app).get("/api/movie/search?q=test");

  expect(response.statusCode).toBe(200);
  expect(response.body.movies.length).toBe(1);
  expect(response.body.movies[0].title).toBe("Test Movie");
});

test("GET /api/movie/search without query returns 400", async () => {
  const response = await request(app).get("/api/movie/search");

  expect(response.statusCode).toBe(400);
});

test("GET /api/movie/search returns empty array if OMDb returns False", async () => {
  axios.get.mockResolvedValue({
    data: {
      Response: "False",
    },
  });

  const response = await request(app).get("/api/movie/search?q=unknown");

  expect(response.statusCode).toBe(200);
  expect(response.body.movies).toEqual([]);
});

test("POST /api/movie saves movie", async () => {
  movieService.saveMovie.mockResolvedValue({
    _id: "tt123",
    title: "Test Movie",
  });

  const response = await request(app).post("/api/movie").send({
    _id: "tt123",
    title: "Test Movie",
  });

  expect(response.statusCode).toBe(200);
  expect(response.body.title).toBe("Test Movie");
});

test("GET /api/movie/shelf returns user shelves", async () => {
  getUserFromToken.mockReturnValue({ _id: "user1" });

  movieService.getAllUserShelves.mockResolvedValue({
    watched: [],
    favorites: [],
  });

  const response = await request(app).get("/api/movie/shelf");

  expect(response.statusCode).toBe(200);
  expect(movieService.getAllUserShelves).toHaveBeenCalledWith("user1");
});

test("GET /api/movie/shelf/:shelf returns movies", async () => {
  getUserFromToken.mockReturnValue({ _id: "user1" });

  movieService.getUserShelf.mockResolvedValue([{ title: "Movie A" }]);

  const response = await request(app).get("/api/movie/shelf/favorites");

  expect(response.statusCode).toBe(200);
  expect(response.body.length).toBe(1);
});

test("GET /api/movie/:id returns movie", async () => {
  movieService.getMovieById.mockResolvedValue({
    _id: "tt123",
    title: "Test Movie",
  });

  const response = await request(app).get("/api/movie/tt123");

  expect(response.statusCode).toBe(200);
  expect(response.body._id).toBe("tt123");
});

test("POST /api/movie/shelf/add adds movie to shelf", async () => {
  getUserFromToken.mockReturnValue({ _id: "user1" });

  movieService.getMovieById.mockResolvedValue({
    _id: "tt123",
    title: "Movie",
  });

  movieService.addMovieToShelf.mockResolvedValue({
    message: "Movie added",
  });

  const response = await request(app).post("/api/movie/shelf/add").send({
    shelf: "favorites",
    _id: "tt123",
    title: "Movie",
  });

  expect(response.statusCode).toBe(200);
  expect(response.body.message).toBe("Movie added");
});

test("POST /api/movie/shelf/add fails if shelf missing", async () => {
  const response = await request(app).post("/api/movie/shelf/add").send({
    _id: "tt123",
    title: "Movie",
  });

  expect(response.statusCode).toBe(400);
});

test("POST /api/movie/shelf/remove removes movie", async () => {
  getUserFromToken.mockReturnValue({ _id: "user1" });

  movieService.removeMovieFromShelf.mockResolvedValue({
    message: "Movie removed",
  });

  const response = await request(app).post("/api/movie/shelf/remove").send({
    movieId: "tt123",
    shelf: "favorites",
  });

  expect(response.statusCode).toBe(200);
  expect(response.body.message).toBe("Movie removed");
});

test("POST /api/movie/shelf/remove fails if parameters missing", async () => {
  const response = await request(app).post("/api/movie/shelf/remove").send({
    movieId: "tt123",
  });

  expect(response.statusCode).toBe(400);
});
