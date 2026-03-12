// tests/movie-service.test.js
const Movie = require("../models/Movie");
const User = require("../models/User");
const movieService = require("../services/movie-service");

jest.mock("../models/Movie");
jest.mock("../models/User");

describe("Movie Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ================= SAVE MOVIE =================
  describe("saveMovie", () => {
    test("returns existing movie if already present", async () => {
      Movie.findById.mockResolvedValue({ _id: "movie1", title: "Film" });

      const result = await movieService.saveMovie({
        _id: "movie1",
        title: "Film",
      });

      expect(result._id).toBe("movie1");
      expect(Movie.findById).toHaveBeenCalledWith("movie1");
    });

    test("creates and saves new movie if not existing", async () => {
      Movie.findById.mockResolvedValue(null);
      const mockSave = jest
        .fn()
        .mockResolvedValue({ _id: "movie2", title: "New Film" });
      Movie.mockImplementation(() => ({ save: mockSave }));

      const result = await movieService.saveMovie({
        _id: "movie2",
        title: "New Film",
      });

      expect(result._id).toBe("movie2");
      expect(mockSave).toHaveBeenCalled();
    });
  });

  // ================= GET MOVIE =================
  describe("getMovieById", () => {
    test("throws if movie not found", async () => {
      Movie.findById.mockResolvedValue(null);
      await expect(movieService.getMovieById("movie1")).rejects.toThrow(
        "Movie not found",
      );
    });

    test("returns movie if found", async () => {
      const movie = { _id: "movie1", title: "Film" };
      Movie.findById.mockResolvedValue(movie);

      const result = await movieService.getMovieById("movie1");
      expect(result).toBe(movie);
    });
  });

  // ================= ADD MOVIE TO SHELF =================
  describe("addMovieToShelf", () => {
    test("throws for invalid shelf name", async () => {
      await expect(
        movieService.addMovieToShelf("user1", "movie1", "invalid"),
      ).rejects.toThrow("Invalid shelf name");
    });

    test("creates shelf and adds movie if shelf missing", async () => {
      const mockSave = jest.fn().mockResolvedValue(true);
      const user = { _id: "user1", movieshelves: [], save: mockSave };
      User.findById.mockResolvedValue(user);

      const result = await movieService.addMovieToShelf(
        "user1",
        "movie1",
        "favorites",
      );

      expect(user.movieshelves[0].name).toBe("favorites");
      expect(user.movieshelves[0].movies).toContain("movie1");
      expect(mockSave).toHaveBeenCalled();
      expect(result.message).toBe("Movie added to favorites");
    });

    test("adds movie if shelf exists", async () => {
      const mockSave = jest.fn().mockResolvedValue(true);
      const user = {
        _id: "user1",
        movieshelves: [{ name: "favorites", movies: [] }],
        save: mockSave,
      };
      User.findById.mockResolvedValue(user);

      const result = await movieService.addMovieToShelf(
        "user1",
        "movie1",
        "favorites",
      );

      expect(user.movieshelves[0].movies).toContain("movie1");
      expect(mockSave).toHaveBeenCalled();
      expect(result.message).toBe("Movie added to favorites");
    });
  });

  // ================= GET USER SHELF =================
  describe("getUserShelf", () => {
    test("returns empty if shelf does not exist", async () => {
      const user = { _id: "user1", movieshelves: [] };
      User.findById.mockResolvedValue(user);

      const result = await movieService.getUserShelf("user1", "favorites");
      expect(result).toEqual([]);
    });
  });

  // ================= REMOVE MOVIE FROM SHELF =================
  describe("removeMovieFromShelf", () => {
    test("throws if shelf not found", async () => {
      const user = { _id: "user1", movieshelves: [] };
      User.findById.mockResolvedValue(user);

      await expect(
        movieService.removeMovieFromShelf("user1", "movie1", "favorites"),
      ).rejects.toThrow("Shelf not found");
    });

    test("removes movie successfully", async () => {
      const mockSave = jest.fn().mockResolvedValue(true);
      const user = {
        _id: "user1",
        movieshelves: [{ name: "favorites", movies: ["movie1"] }],
        save: mockSave,
      };
      User.findById.mockResolvedValue(user);

      const result = await movieService.removeMovieFromShelf(
        "user1",
        "movie1",
        "favorites",
      );

      expect(user.movieshelves[0].movies).not.toContain("movie1");
      expect(mockSave).toHaveBeenCalled();
      expect(result.message).toMatch(/removed from favorites/);
    });
  });
});
