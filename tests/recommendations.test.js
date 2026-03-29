// tests/recommendations-routes.test.js
const request = require("supertest");
const express = require("express");
const router = require("../routes/recommendations");

jest.mock("../services/user-service");
jest.mock("../services/movie-service");
jest.mock("../services/music-service");
jest.mock("../services/book-service");
jest.mock("../services/recommendations-service");
jest.mock("axios");

const { getUserFromToken } = require("../services/user-service");
const movieService = require("../services/movie-service");
const musicService = require("../services/music-service");
const booksService = require("../services/book-service");
const { getRecommendations } = require("../services/recommendations-service");
const axios = require("axios");

// App setup
const app = express();
app.use(express.json());
app.use("/recommendations", router);

const mockUser = { _id: "user123" };

afterEach(() => {
  jest.clearAllMocks();
});

//
// ───────────────────────────────── MOVIES ─────────────────────────────────
//
describe("GET /recommendations/movies", () => {
  const mockFavorites = [{ title: "Inception" }, { title: "The Matrix" }];

  const mockAIRecs = [
    {
      title: "Interstellar",
      year: 2014,
      reason: "Great visuals",
      tags: ["sci-fi"],
    },
  ];

  const mockOMDbData = {
    data: {
      imdbID: "tt0816692",
      Title: "Interstellar",
      Year: "2014",
      Director: "Christopher Nolan",
      Poster: "url",
      Type: "movie",
      Response: "True",
    },
  };

  it("returns movie recommendations successfully", async () => {
    getUserFromToken.mockReturnValue(mockUser);
    movieService.getUserShelf.mockResolvedValue(mockFavorites);
    getRecommendations.mockResolvedValue(mockAIRecs);
    axios.get.mockResolvedValue(mockOMDbData);

    const res = await request(app).get("/recommendations/movies");

    expect(res.status).toBe(200);
    expect(res.body.recommendations).toHaveLength(1);
  });

  it("returns 401 if unauthorized", async () => {
    getUserFromToken.mockReturnValue(null);

    const res = await request(app).get("/recommendations/movies");

    expect(res.status).toBe(401);
  });

  it("returns empty if no favorites", async () => {
    getUserFromToken.mockReturnValue(mockUser);
    movieService.getUserShelf.mockResolvedValue([]);

    const res = await request(app).get("/recommendations/movies");

    expect(res.body.recommendations).toEqual([]);
  });

  it("filters excluded movies", async () => {
    getUserFromToken.mockReturnValue(mockUser);

    movieService.getUserShelf
      .mockResolvedValueOnce(mockFavorites) // favorites
      .mockResolvedValueOnce([{ title: "Interstellar" }]) // watched
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    getRecommendations.mockResolvedValue(mockAIRecs);
    axios.get.mockResolvedValue(mockOMDbData);

    const res = await request(app).get("/recommendations/movies");

    expect(res.body.recommendations).toEqual([]);
  });

  it("handles OMDb failure", async () => {
    getUserFromToken.mockReturnValue(mockUser);
    movieService.getUserShelf.mockResolvedValue(mockFavorites);
    getRecommendations.mockResolvedValue(mockAIRecs);
    axios.get.mockRejectedValue(new Error("fail"));

    const res = await request(app).get("/recommendations/movies");

    expect(res.body.recommendations).toEqual([]);
  });
});

//
// ───────────────────────────────── MUSIC ─────────────────────────────────
//
describe("GET /recommendations/music", () => {
  it("returns music recommendations successfully", async () => {
    getUserFromToken.mockReturnValue(mockUser);

    musicService.getUserShelf
      .mockResolvedValueOnce([
        { title: "Blinding Lights", artist: { name: "The Weeknd" } },
      ])
      .mockResolvedValueOnce([]);

    getRecommendations.mockResolvedValue([
      {
        title: "Starboy",
        artist: "The Weeknd",
        reason: "Similar vibe",
        tags: ["pop"],
      },
    ]);

    axios.get.mockResolvedValue({
      data: {
        recordings: [
          {
            id: "1",
            title: "Starboy",
            length: 200000,
            "artist-credit": [{ name: "The Weeknd", artist: { id: "a1" } }],
            releases: [{ id: "r1", title: "Starboy", date: "2016" }],
          },
        ],
      },
    });

    const res = await request(app).get("/recommendations/music");

    expect(res.status).toBe(200);
    expect(res.body.recommendations).toHaveLength(1);
  });

  it("returns empty if no favorites", async () => {
    getUserFromToken.mockReturnValue(mockUser);
    musicService.getUserShelf.mockResolvedValue([]);

    const res = await request(app).get("/recommendations/music");

    expect(res.body.recommendations).toEqual([]);
  });

  it("filters already listening tracks", async () => {
    getUserFromToken.mockReturnValue(mockUser);

    musicService.getUserShelf
      .mockResolvedValueOnce([{ title: "Blinding Lights" }])
      .mockResolvedValueOnce([{ title: "Starboy" }]);

    getRecommendations.mockResolvedValue([
      { title: "Starboy", artist: "The Weeknd" },
    ]);

    axios.get.mockResolvedValue({
      data: {
        recordings: [
          { id: "1", title: "Starboy", "artist-credit": [{}], releases: [{}] },
        ],
      },
    });

    const res = await request(app).get("/recommendations/music");

    expect(res.body.recommendations).toEqual([]);
  });

  it("handles MusicBrainz failure", async () => {
    getUserFromToken.mockReturnValue(mockUser);

    musicService.getUserShelf
      .mockResolvedValueOnce([{ title: "Blinding Lights" }])
      .mockResolvedValueOnce([]);

    getRecommendations.mockResolvedValue([
      { title: "Starboy", artist: "The Weeknd" },
    ]);

    axios.get.mockRejectedValue(new Error("fail"));

    const res = await request(app).get("/recommendations/music");

    expect(res.body.recommendations).toEqual([]);
  });
});

//
// ───────────────────────────────── BOOKS ─────────────────────────────────
//
describe("GET /recommendations/books", () => {
  it("returns book recommendations successfully", async () => {
    getUserFromToken.mockReturnValue(mockUser);

    booksService.getUserShelf
      .mockResolvedValueOnce([{ title: "1984", authors: ["Orwell"] }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    getRecommendations.mockResolvedValue([
      {
        title: "Brave New World",
        author: "Aldous Huxley",
        reason: "Similar dystopia",
      },
    ]);

    axios.get.mockResolvedValue({
      data: {
        items: [
          {
            id: "b1",
            volumeInfo: {
              title: "Brave New World",
              authors: ["Aldous Huxley"],
            },
          },
        ],
      },
    });

    const res = await request(app).get("/recommendations/books");

    expect(res.status).toBe(200);
    expect(res.body.recommendations).toHaveLength(1);
  });

  it("returns empty if no favorites", async () => {
    getUserFromToken.mockReturnValue(mockUser);
    booksService.getUserShelf.mockResolvedValue([]);

    const res = await request(app).get("/recommendations/books");

    expect(res.body.recommendations).toEqual([]);
  });

  it("filters existing books", async () => {
    getUserFromToken.mockReturnValue(mockUser);

    booksService.getUserShelf
      .mockResolvedValueOnce([{ title: "1984" }])
      .mockResolvedValueOnce([{ title: "Brave New World" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    getRecommendations.mockResolvedValue([{ title: "Brave New World" }]);

    axios.get.mockResolvedValue({
      data: {
        items: [
          {
            id: "b1",
            volumeInfo: { title: "Brave New World" },
          },
        ],
      },
    });

    const res = await request(app).get("/recommendations/books");

    expect(res.body.recommendations).toEqual([]);
  });

  it("handles Google Books failure", async () => {
    getUserFromToken.mockReturnValue(mockUser);

    booksService.getUserShelf
      .mockResolvedValueOnce([{ title: "1984" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    getRecommendations.mockResolvedValue([{ title: "Brave New World" }]);

    axios.get.mockRejectedValue(new Error("fail"));

    const res = await request(app).get("/recommendations/books");

    expect(res.body.recommendations).toEqual([]);
  });
});
