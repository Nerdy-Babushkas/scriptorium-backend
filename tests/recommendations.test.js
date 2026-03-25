// tests/recommendations-routes.test.js
const request = require("supertest");
const express = require("express");
const router = require("../routes/recommendations");

jest.mock("../services/user-service");
jest.mock("../services/movie-service");
jest.mock("../services/recommendations-service");
jest.mock("axios");

const { getUserFromToken } = require("../services/user-service");
const movieService = require("../services/movie-service");
const { getRecommendations } = require("../services/recommendations-service");
const axios = require("axios");

// Create Express app for testing
const app = express();
app.use(express.json());
app.use("/recommendations", router);

describe("GET /recommendations/movies", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockUser = { _id: "user123", name: "Test User" };
  const mockFavorites = [{ title: "Inception" }, { title: "The Matrix" }];
  const mockAIRecs = [
    {
      title: "Interstellar",
      year: 2014,
      director: "Nolan",
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
      Poster: "some_url",
      Type: "movie",
      Response: "True",
    },
  };

  it("returns recommendations successfully", async () => {
    getUserFromToken.mockReturnValue(mockUser);
    movieService.getUserShelf.mockResolvedValue(mockFavorites);
    getRecommendations.mockResolvedValue(mockAIRecs);
    axios.get.mockResolvedValue(mockOMDbData);

    const res = await request(app).get("/recommendations/movies");

    expect(res.status).toBe(200);
    expect(res.body.recommendations).toHaveLength(1);
    expect(res.body.recommendations[0]).toMatchObject({
      _id: "tt0816692",
      title: "Interstellar",
      director: "Christopher Nolan",
      reason: "Great visuals",
      tags: ["sci-fi"],
    });

    // Verify mocks were called
    expect(getUserFromToken).toHaveBeenCalled();
    expect(movieService.getUserShelf).toHaveBeenCalledWith(
      mockUser._id,
      "favorites",
    );
    expect(getRecommendations).toHaveBeenCalled();
    expect(axios.get).toHaveBeenCalled();
  });

  it("returns 401 if user is not found", async () => {
    getUserFromToken.mockReturnValue(null);

    const res = await request(app).get("/recommendations/movies");

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Unauthorized");
  });

  it("returns empty recommendations if user has no favorites", async () => {
    getUserFromToken.mockReturnValue(mockUser);
    movieService.getUserShelf.mockResolvedValue([]);

    const res = await request(app).get("/recommendations/movies");

    expect(res.status).toBe(200);
    expect(res.body.recommendations).toEqual([]);
    expect(res.body.message).toBe("No favorite movies found");
  });

  it("returns empty recommendations if AI returns nothing", async () => {
    getUserFromToken.mockReturnValue(mockUser);
    movieService.getUserShelf.mockResolvedValue(mockFavorites);
    getRecommendations.mockResolvedValue([]);

    const res = await request(app).get("/recommendations/movies");

    expect(res.status).toBe(200);
    expect(res.body.recommendations).toEqual([]);
    expect(res.body.message).toBe("No recommendations found");
  });

  it("handles OMDb errors gracefully", async () => {
    getUserFromToken.mockReturnValue(mockUser);
    movieService.getUserShelf.mockResolvedValue(mockFavorites);
    getRecommendations.mockResolvedValue(mockAIRecs);
    axios.get.mockRejectedValue(new Error("OMDb down"));

    const res = await request(app).get("/recommendations/movies");

    expect(res.status).toBe(200);
    expect(res.body.recommendations).toEqual([]); // No successful OMDb fetch
  });
});
