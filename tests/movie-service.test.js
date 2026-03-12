// tests/movie-service-full.test.js
const Movie = require("../models/Movie");
const User = require("../models/User");
const movieService = require("../services/movie-service");

jest.mock("../models/Movie");
jest.mock("../models/User");

describe("Movie Service Full Coverage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ================= SAVE MOVIE =================
  describe("saveMovie", () => {
    test("returns existing movie if already present", async () => {
      Movie.findById.mockResolvedValue({ _id: "movie1" });
      const result = await movieService.saveMovie({ _id: "movie1" });
      expect(result._id).toBe("movie1");
    });

    test("creates new movie if not present", async () => {
      Movie.findById.mockResolvedValue(null);
      const mockSave = jest.fn().mockResolvedValue({ _id: "movie2" });
      Movie.mockImplementation(() => ({ save: mockSave }));
      const result = await movieService.saveMovie({ _id: "movie2" });
      expect(mockSave).toHaveBeenCalled();
      expect(result._id).toBe("movie2");
    });
  });

  // ================= GET MOVIE =================
  describe("getMovieById", () => {
    test("throws if movie not found", async () => {
      Movie.findById.mockResolvedValue(null);
      await expect(movieService.getMovieById("movieX")).rejects.toThrow(
        "Movie not found",
      );
    });

    test("returns movie if found", async () => {
      const movie = { _id: "movie1" };
      Movie.findById.mockResolvedValue(movie);
      const result = await movieService.getMovieById("movie1");
      expect(result).toBe(movie);
    });
  });

  // ================= GET MANY MOVIES =================
  describe("getMoviesByIds", () => {
    test("returns movies array", async () => {
      const movies = [{ _id: "1" }, { _id: "2" }];
      Movie.find.mockResolvedValue(movies);
      const result = await movieService.getMoviesByIds(["1", "2"]);
      expect(result).toBe(movies);
      expect(Movie.find).toHaveBeenCalledWith({ _id: { $in: ["1", "2"] } });
    });
  });

  // ================= ADD MOVIE TO SHELF =================
  describe("addMovieToShelf", () => {
    test("throws for invalid shelf", async () => {
      await expect(
        movieService.addMovieToShelf("user1", "m1", "invalid"),
      ).rejects.toThrow("Invalid shelf name");
    });

    test("throws if user not found", async () => {
      User.findById.mockResolvedValue(null);
      await expect(
        movieService.addMovieToShelf("userX", "m1", "favorites"),
      ).rejects.toThrow("User not found");
    });

    test("creates shelf if missing", async () => {
      const mockSave = jest.fn();
      const user = { _id: "u1", movieshelves: [], save: mockSave };
      User.findById.mockResolvedValue(user);

      const result = await movieService.addMovieToShelf(
        "u1",
        "m1",
        "favorites",
      );
      expect(user.movieshelves[0].name).toBe("favorites");
      expect(user.movieshelves[0].movies).toContain("m1");
      expect(mockSave).toHaveBeenCalled();
      expect(result.message).toMatch(/added to favorites/);
    });

    test("adds to existing shelf", async () => {
      const mockSave = jest.fn();
      const user = {
        _id: "u1",
        movieshelves: [{ name: "favorites", movies: [] }],
        save: mockSave,
      };
      User.findById.mockResolvedValue(user);

      const result = await movieService.addMovieToShelf(
        "u1",
        "m2",
        "favorites",
      );
      expect(user.movieshelves[0].movies).toContain("m2");
      expect(mockSave).toHaveBeenCalled();
    });
  });

  // ================= GET SPECIFIC USER SHELF =================
  describe("getUserShelf", () => {
    test("throws if invalid shelf", async () => {
      await expect(movieService.getUserShelf("u1", "badShelf")).rejects.toThrow(
        "Invalid shelf name",
      );
    });

    test("throws if user not found", async () => {
      User.findById.mockResolvedValue(null);
      await expect(
        movieService.getUserShelf("uX", "favorites"),
      ).rejects.toThrow("User not found");
    });

    test("returns empty if shelf missing", async () => {
      const user = { _id: "u1", movieshelves: [] };
      User.findById.mockResolvedValue(user);
      const result = await movieService.getUserShelf("u1", "favorites");
      expect(result).toEqual([]);
    });

    test("returns movies if shelf exists", async () => {
      const user = {
        _id: "u1",
        movieshelves: [{ name: "favorites", movies: ["m1"] }],
      };
      User.findById.mockResolvedValue(user);
      Movie.find.mockResolvedValue([{ _id: "m1" }]);

      const result = await movieService.getUserShelf("u1", "favorites");
      expect(result.length).toBe(1);
      expect(Movie.find).toHaveBeenCalled();
    });
  });

  // ================= GET ALL USER SHELVES =================
  describe("getAllUserShelves", () => {
    test("throws if user not found", async () => {
      User.findById.mockResolvedValue(null);
      await expect(movieService.getAllUserShelves("uX")).rejects.toThrow(
        "User not found",
      );
    });

    test("returns empty arrays if all shelves missing", async () => {
      const user = { _id: "u1", movieshelves: [] };
      User.findById.mockResolvedValue(user);
      Movie.find.mockResolvedValue([]);
      const result = await movieService.getAllUserShelves("u1");
      expect(result.favorites).toEqual([]);
      expect(result.watchlist).toEqual([]);
      expect(result.watching).toEqual([]);
      expect(result.watched).toEqual([]);
    });

    test("returns movies for all shelves", async () => {
      const user = {
        _id: "u1",
        movieshelves: [
          { name: "favorites", movies: ["m1"] },
          { name: "watchlist", movies: ["m2"] },
          { name: "watching", movies: ["m3"] },
          { name: "watched", movies: ["m4"] },
        ],
      };
      User.findById.mockResolvedValue(user);
      Movie.find.mockImplementation(({ _id: { $in } }) =>
        Promise.resolve($in.map((id) => ({ _id: id }))),
      );

      const result = await movieService.getAllUserShelves("u1");
      expect(result.favorites[0]._id).toBe("m1");
      expect(result.watchlist[0]._id).toBe("m2");
      expect(result.watching[0]._id).toBe("m3");
      expect(result.watched[0]._id).toBe("m4");
    });
  });

  // ================= REMOVE MOVIE FROM SHELF =================
  describe("removeMovieFromShelf", () => {
    test("throws if invalid shelf", async () => {
      await expect(
        movieService.removeMovieFromShelf("u1", "m1", "badShelf"),
      ).rejects.toThrow("Invalid shelf name");
    });

    test("throws if user not found", async () => {
      User.findById.mockResolvedValue(null);
      await expect(
        movieService.removeMovieFromShelf("uX", "m1", "favorites"),
      ).rejects.toThrow("User not found");
    });

    test("throws if shelf missing", async () => {
      const user = { _id: "u1", movieshelves: [] };
      User.findById.mockResolvedValue(user);
      await expect(
        movieService.removeMovieFromShelf("u1", "m1", "favorites"),
      ).rejects.toThrow("Shelf not found");
    });

    test("returns message if movie not in shelf", async () => {
      const mockSave = jest.fn();
      const user = {
        _id: "u1",
        movieshelves: [{ name: "favorites", movies: [] }],
        save: mockSave,
      };
      User.findById.mockResolvedValue(user);
      const result = await movieService.removeMovieFromShelf(
        "u1",
        "m1",
        "favorites",
      );
      expect(result.message).toBe("Movie was not in shelf");
    });

    test("removes movie successfully", async () => {
      const mockSave = jest.fn();
      const user = {
        _id: "u1",
        movieshelves: [{ name: "favorites", movies: ["m1"] }],
        save: mockSave,
      };
      User.findById.mockResolvedValue(user);
      const result = await movieService.removeMovieFromShelf(
        "u1",
        "m1",
        "favorites",
      );
      expect(user.movieshelves[0].movies).not.toContain("m1");
      expect(result.message).toMatch(/removed from favorites/);
      expect(mockSave).toHaveBeenCalled();
    });
  });
});
