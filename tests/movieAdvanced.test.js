// tests/movieAdvanced.test.js
const request = require("supertest");
const express = require("express");

const movieRouter = require("../routes/movies");
jest.mock("axios");
jest.mock("../services/movie-service");
jest.mock("../services/user-service");

const axios = require("axios");

const app = express();
app.use(express.json());
app.use("/api/movie", movieRouter);

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Advanced Movie Search", () => {
  const apiKey = "fakekey";
  beforeAll(() => {
    process.env.OMDB_API_KEY = apiKey;
  });

  test("returns 400 if no query parameters", async () => {
    const response = await request(app).get("/api/movie/advanced/search");
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("Provide at least one search parameter");
  });

  test("returns 500 if API key is missing", async () => {
    delete process.env.OMDB_API_KEY;
    const response = await request(app).get(
      "/api/movie/advanced/search?q=test",
    );
    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe("OMDb API key not set");
    process.env.OMDB_API_KEY = apiKey; // restore key
  });

  test("returns movies from OMDb search", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        Response: "True",
        totalResults: "2",
        Search: [
          {
            imdbID: "tt1",
            Title: "Movie One",
            Year: "2020",
            Poster: "",
            Type: "movie",
          },
          {
            imdbID: "tt2",
            Title: "Movie Two",
            Year: "2021",
            Poster: "",
            Type: "movie",
          },
        ],
      },
    });

    const response = await request(app).get(
      "/api/movie/advanced/search?q=test",
    );

    expect(response.statusCode).toBe(200);
    expect(response.body.totalResults).toBe(2);
    expect(response.body.movies.length).toBe(2);
    expect(response.body.movies[0].title).toBe("Movie One");
  });

  test("returns empty array if OMDb search Response is False", async () => {
    axios.get.mockResolvedValueOnce({
      data: { Response: "False" },
    });

    const response = await request(app).get(
      "/api/movie/advanced/search?q=unknown",
    );

    expect(response.statusCode).toBe(200);
    expect(response.body.movies).toEqual([]);
    expect(response.body.totalResults).toBe(0);
  });

  test("filters by actor", async () => {
    // First call returns search results
    axios.get.mockResolvedValueOnce({
      data: {
        Response: "True",
        totalResults: "1",
        Search: [
          {
            imdbID: "tt123",
            Title: "Movie A",
            Year: "2020",
            Poster: "",
            Type: "movie",
          },
        ],
      },
    });
    // Second call returns movie details with actors
    axios.get.mockResolvedValueOnce({
      data: { Actors: "Leonardo DiCaprio, Tom Hardy", Genre: "Action, Drama" },
    });

    const response = await request(app).get(
      "/api/movie/advanced/search?actor=Leonardo",
    );

    expect(response.statusCode).toBe(200);
    expect(response.body.movies.length).toBe(1);
    expect(response.body.movies[0].title).toBe("Movie A");
  });

  test("filters by genre", async () => {
    // First call returns search results
    axios.get.mockResolvedValueOnce({
      data: {
        Response: "True",
        totalResults: "1",
        Search: [
          {
            imdbID: "tt456",
            Title: "Movie B",
            Year: "2021",
            Poster: "",
            Type: "movie",
          },
        ],
      },
    });
    // Second call returns movie details with genres
    axios.get.mockResolvedValueOnce({
      data: { Actors: "Actor X", Genre: "Comedy, Drama" },
    });

    const response = await request(app).get(
      "/api/movie/advanced/search?genre=Comedy",
    );

    expect(response.statusCode).toBe(200);
    expect(response.body.movies.length).toBe(1);
    expect(response.body.movies[0].title).toBe("Movie B");
  });

  test("returns empty after actor filter if no match", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        Response: "True",
        totalResults: "1",
        Search: [
          {
            imdbID: "tt789",
            Title: "Movie C",
            Year: "2022",
            Poster: "",
            Type: "movie",
          },
        ],
      },
    });
    axios.get.mockResolvedValueOnce({
      data: { Actors: "Actor X", Genre: "Action" },
    });

    const response = await request(app).get(
      "/api/movie/advanced/search?actor=Nonexistent",
    );

    expect(response.statusCode).toBe(200);
    expect(response.body.movies.length).toBe(0);
  });
});
