// tests/music-service-full.test.js
const Music = require("../models/Music");
const User = require("../models/User");
const musicService = require("../services/music-service");

jest.mock("../models/Music");
jest.mock("../models/User");

describe("Music Service Full Coverage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ================= SAVE TRACK =================
  describe("saveTrack", () => {
    test("returns existing track if already present", async () => {
      Music.findById.mockResolvedValue({ _id: "track1" });
      const result = await musicService.saveTrack({ _id: "track1" });
      expect(result._id).toBe("track1");
    });

    test("creates new track if not present", async () => {
      Music.findById.mockResolvedValue(null);
      const mockSave = jest.fn().mockResolvedValue({ _id: "track2" });
      Music.mockImplementation(() => ({ save: mockSave }));
      const result = await musicService.saveTrack({ _id: "track2" });
      expect(mockSave).toHaveBeenCalled();
      expect(result._id).toBe("track2");
    });
  });

  // ================= GET TRACK =================
  describe("getTrackById", () => {
    test("throws if track not found", async () => {
      Music.findById.mockResolvedValue(null);
      await expect(musicService.getTrackById("trackX")).rejects.toThrow(
        "Track not found",
      );
    });

    test("returns track if found", async () => {
      const track = { _id: "track1" };
      Music.findById.mockResolvedValue(track);
      const result = await musicService.getTrackById("track1");
      expect(result).toBe(track);
    });
  });

  // ================= GET MANY TRACKS =================
  describe("getTracksByIds", () => {
    test("returns tracks array", async () => {
      const tracks = [{ _id: "1" }, { _id: "2" }];
      Music.find.mockResolvedValue(tracks);
      const result = await musicService.getTracksByIds(["1", "2"]);
      expect(result).toBe(tracks);
      expect(Music.find).toHaveBeenCalledWith({ _id: { $in: ["1", "2"] } });
    });
  });

  // ================= ADD TRACK TO SHELF =================
  describe("addTrackToShelf", () => {
    test("throws for invalid shelf", async () => {
      await expect(
        musicService.addTrackToShelf("user1", "t1", "invalid"),
      ).rejects.toThrow("Invalid shelf name");
    });

    test("throws if user not found", async () => {
      User.findById.mockResolvedValue(null);
      await expect(
        musicService.addTrackToShelf("userX", "t1", "favorites"),
      ).rejects.toThrow("User not found");
    });

    test("creates shelf if missing", async () => {
      const mockSave = jest.fn();
      const user = { _id: "u1", musicShelves: [], save: mockSave };
      User.findById.mockResolvedValue(user);

      const result = await musicService.addTrackToShelf(
        "u1",
        "t1",
        "favorites",
      );
      expect(user.musicShelves[0].name).toBe("favorites");
      expect(user.musicShelves[0].tracks).toContain("t1");
      expect(mockSave).toHaveBeenCalled();
      expect(result.message).toMatch(/added to favorites/);
    });

    test("adds to existing shelf", async () => {
      const mockSave = jest.fn();
      const user = {
        _id: "u1",
        musicShelves: [{ name: "favorites", tracks: [] }],
        save: mockSave,
      };
      User.findById.mockResolvedValue(user);

      const result = await musicService.addTrackToShelf(
        "u1",
        "t2",
        "favorites",
      );
      expect(user.musicShelves[0].tracks).toContain("t2");
      expect(mockSave).toHaveBeenCalled();
    });
  });

  // ================= GET SPECIFIC USER SHELF =================
  describe("getUserShelf", () => {
    test("throws if invalid shelf", async () => {
      await expect(musicService.getUserShelf("u1", "badShelf")).rejects.toThrow(
        "Invalid shelf name",
      );
    });

    test("throws if user not found", async () => {
      User.findById.mockResolvedValue(null);
      await expect(
        musicService.getUserShelf("uX", "favorites"),
      ).rejects.toThrow("User not found");
    });

    test("returns empty if shelf missing", async () => {
      const user = { _id: "u1", musicShelves: [] };
      User.findById.mockResolvedValue(user);
      const result = await musicService.getUserShelf("u1", "favorites");
      expect(result).toEqual([]);
    });

    test("returns tracks if shelf exists", async () => {
      const user = {
        _id: "u1",
        musicShelves: [{ name: "favorites", tracks: ["t1"] }],
      };
      User.findById.mockResolvedValue(user);
      Music.find.mockResolvedValue([{ _id: "t1" }]);

      const result = await musicService.getUserShelf("u1", "favorites");
      expect(result.length).toBe(1);
      expect(Music.find).toHaveBeenCalled();
    });
  });

  // ================= GET ALL USER SHELVES =================
  describe("getAllUserShelves", () => {
    test("throws if user not found", async () => {
      User.findById.mockResolvedValue(null);
      await expect(musicService.getAllUserShelves("uX")).rejects.toThrow(
        "User not found",
      );
    });

    test("returns empty arrays if all shelves missing", async () => {
      const user = { _id: "u1", musicShelves: [] };
      User.findById.mockResolvedValue(user);
      Music.find.mockResolvedValue([]);
      const result = await musicService.getAllUserShelves("u1");
      expect(result.favorites).toEqual([]);
      expect(result.wishlist).toEqual([]);
      expect(result.listening).toEqual([]);
      expect(result.finished).toEqual([]);
    });

    test("returns tracks for all shelves", async () => {
      const user = {
        _id: "u1",
        musicShelves: [
          { name: "favorites", tracks: ["t1"] },
          { name: "wishlist", tracks: ["t2"] },
          { name: "listening", tracks: ["t3"] },
          { name: "finished", tracks: ["t4"] },
        ],
      };
      User.findById.mockResolvedValue(user);
      Music.find.mockImplementation(({ _id: { $in } }) =>
        Promise.resolve($in.map((id) => ({ _id: id }))),
      );

      const result = await musicService.getAllUserShelves("u1");
      expect(result.favorites[0]._id).toBe("t1");
      expect(result.wishlist[0]._id).toBe("t2");
      expect(result.listening[0]._id).toBe("t3");
      expect(result.finished[0]._id).toBe("t4");
    });
  });

  // ================= REMOVE TRACK FROM SHELF =================
  describe("removeTrackFromShelf", () => {
    test("throws if invalid shelf", async () => {
      await expect(
        musicService.removeTrackFromShelf("u1", "t1", "badShelf"),
      ).rejects.toThrow("Invalid shelf name");
    });

    test("throws if user not found", async () => {
      User.findById.mockResolvedValue(null);
      await expect(
        musicService.removeTrackFromShelf("uX", "t1", "favorites"),
      ).rejects.toThrow("User not found");
    });

    test("throws if shelf missing", async () => {
      const user = { _id: "u1", musicShelves: [] };
      User.findById.mockResolvedValue(user);
      await expect(
        musicService.removeTrackFromShelf("u1", "t1", "favorites"),
      ).rejects.toThrow("Shelf not found");
    });

    test("returns message if track not in shelf", async () => {
      const mockSave = jest.fn();
      const user = {
        _id: "u1",
        musicShelves: [{ name: "favorites", tracks: [] }],
        save: mockSave,
      };
      User.findById.mockResolvedValue(user);
      const result = await musicService.removeTrackFromShelf(
        "u1",
        "t1",
        "favorites",
      );
      expect(result.message).toBe("Track was not in shelf");
    });

    test("removes track successfully", async () => {
      const mockSave = jest.fn();
      const user = {
        _id: "u1",
        musicShelves: [{ name: "favorites", tracks: ["t1"] }],
        save: mockSave,
      };
      User.findById.mockResolvedValue(user);
      const result = await musicService.removeTrackFromShelf(
        "u1",
        "t1",
        "favorites",
      );
      expect(user.musicShelves[0].tracks).not.toContain("t1");
      expect(result.message).toMatch(/removed from favorites/);
      expect(mockSave).toHaveBeenCalled();
    });
  });
});
