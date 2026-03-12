// tests/music-service.test.js
const Music = require("../models/Music");
const User = require("../models/User");
const musicService = require("../services/music-service");

jest.mock("../models/Music");
jest.mock("../models/User");

describe("Music Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ================= SAVE TRACK =================
  describe("saveTrack", () => {
    test("returns existing track if already present", async () => {
      Music.findById.mockResolvedValue({ _id: "track1", title: "Song" });

      const result = await musicService.saveTrack({
        _id: "track1",
        title: "Song",
      });

      expect(result._id).toBe("track1");
      expect(Music.findById).toHaveBeenCalledWith("track1");
    });

    test("creates and saves new track if not existing", async () => {
      Music.findById.mockResolvedValue(null);
      const mockSave = jest
        .fn()
        .mockResolvedValue({ _id: "track2", title: "New Song" });
      Music.mockImplementation(() => ({ save: mockSave }));

      const result = await musicService.saveTrack({
        _id: "track2",
        title: "New Song",
      });

      expect(result._id).toBe("track2");
      expect(mockSave).toHaveBeenCalled();
    });
  });

  // ================= GET TRACK =================
  describe("getTrackById", () => {
    test("throws if track not found", async () => {
      Music.findById.mockResolvedValue(null);
      await expect(musicService.getTrackById("track1")).rejects.toThrow(
        "Track not found",
      );
    });

    test("returns track if found", async () => {
      const track = { _id: "track1", title: "Song" };
      Music.findById.mockResolvedValue(track);

      const result = await musicService.getTrackById("track1");
      expect(result).toBe(track);
    });
  });

  // ================= ADD TRACK TO SHELF =================
  describe("addTrackToShelf", () => {
    test("throws for invalid shelf name", async () => {
      await expect(
        musicService.addTrackToShelf("user1", "track1", "invalid"),
      ).rejects.toThrow("Invalid shelf name");
    });

    test("creates shelf and adds track if shelf missing", async () => {
      const mockSave = jest.fn().mockResolvedValue(true);
      const user = { _id: "user1", musicShelves: [], save: mockSave };
      User.findById.mockResolvedValue(user);

      const result = await musicService.addTrackToShelf(
        "user1",
        "track1",
        "favorites",
      );

      expect(user.musicShelves[0].name).toBe("favorites");
      expect(user.musicShelves[0].tracks).toContain("track1");
      expect(mockSave).toHaveBeenCalled();
      expect(result.message).toBe("Track added to favorites");
    });

    test("adds track if shelf exists", async () => {
      const mockSave = jest.fn().mockResolvedValue(true);
      const user = {
        _id: "user1",
        musicShelves: [{ name: "favorites", tracks: [] }],
        save: mockSave,
      };
      User.findById.mockResolvedValue(user);

      const result = await musicService.addTrackToShelf(
        "user1",
        "track1",
        "favorites",
      );

      expect(user.musicShelves[0].tracks).toContain("track1");
      expect(mockSave).toHaveBeenCalled();
      expect(result.message).toBe("Track added to favorites");
    });
  });

  // ================= GET USER SHELF =================
  describe("getUserShelf", () => {
    test("returns empty if shelf does not exist", async () => {
      const user = { _id: "user1", musicShelves: [] };
      User.findById.mockResolvedValue(user);

      const result = await musicService.getUserShelf("user1", "favorites");
      expect(result).toEqual([]);
    });
  });

  // ================= REMOVE TRACK FROM SHELF =================
  describe("removeTrackFromShelf", () => {
    test("throws if shelf not found", async () => {
      const user = { _id: "user1", musicShelves: [] };
      User.findById.mockResolvedValue(user);

      await expect(
        musicService.removeTrackFromShelf("user1", "track1", "favorites"),
      ).rejects.toThrow("Shelf not found");
    });

    test("removes track successfully", async () => {
      const mockSave = jest.fn().mockResolvedValue(true);
      const user = {
        _id: "user1",
        musicShelves: [{ name: "favorites", tracks: ["track1"] }],
        save: mockSave,
      };
      User.findById.mockResolvedValue(user);

      const result = await musicService.removeTrackFromShelf(
        "user1",
        "track1",
        "favorites",
      );

      expect(user.musicShelves[0].tracks).not.toContain("track1");
      expect(mockSave).toHaveBeenCalled();
      expect(result.message).toMatch(/removed from favorites/);
    });
  });
});
