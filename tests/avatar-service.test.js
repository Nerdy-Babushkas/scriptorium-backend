// tests/avatar-service.test.js
const avatarService = require("../services/avatar-service");
const User = require("../models/User");
const yarnService = require("../services/yarn-service");

jest.mock("../models/User");
jest.mock("../services/yarn-service");

describe("Avatar Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ================= GET AVATAR STATE =================
  describe("getAvatarState", () => {
    test("returns correct catalogue with owned and equipped flags", async () => {
      User.findById.mockReturnValue({
        select: () => ({
          lean: () =>
            Promise.resolve({
              avatarKey: "cat",
              unlockedAvatars: ["cat"],
            }),
        }),
      });

      const result = await avatarService.getAvatarState("user1");

      const cat = result.catalogue.find((a) => a.key === "cat");
      const dog = result.catalogue.find((a) => a.key === "dog");

      expect(cat.owned).toBe(true);
      expect(cat.equipped).toBe(true);

      expect(dog.owned).toBe(false);
      expect(dog.equipped).toBe(false);

      expect(result.equipped).toBe("cat");
    });

    test("defaults to hatchling if no unlocked avatars", async () => {
      User.findById.mockReturnValue({
        select: () => ({
          lean: () =>
            Promise.resolve({
              avatarKey: null,
              unlockedAvatars: [],
            }),
        }),
      });

      const result = await avatarService.getAvatarState("user1");

      expect(result.equipped).toBe("hatchling");

      const hatchling = result.catalogue.find((a) => a.key === "hatchling");

      expect(hatchling.owned).toBe(true);
    });

    test("throws if user not found", async () => {
      User.findById.mockReturnValue({
        select: () => ({
          lean: () => Promise.resolve(null),
        }),
      });

      await expect(avatarService.getAvatarState("user1")).rejects.toThrow(
        "User not found",
      );
    });
  });

  // ================= UNLOCK AVATAR =================
  describe("unlockAvatar", () => {
    test("successfully unlocks avatar", async () => {
      const user = {
        unlockedAvatars: [],
        save: jest.fn(),
      };

      User.findById.mockReturnValue({
        select: () => Promise.resolve(user),
      });

      yarnService.spendYarns.mockResolvedValue();

      const result = await avatarService.unlockAvatar("user1", "cat");

      expect(yarnService.spendYarns).toHaveBeenCalledWith("user1", 50);

      expect(user.unlockedAvatars).toContain("cat");
      expect(user.save).toHaveBeenCalled();

      expect(result).toEqual({ unlockedKey: "cat", cost: 50 });
    });

    test("throws if avatar key is invalid", async () => {
      await expect(
        avatarService.unlockAvatar("user1", "invalid"),
      ).rejects.toThrow("Unknown avatar key: invalid");
    });

    test("throws if avatar is free", async () => {
      await expect(
        avatarService.unlockAvatar("user1", "hatchling"),
      ).rejects.toThrow("This avatar is already free");
    });

    test("throws if user not found", async () => {
      User.findById.mockReturnValue({
        select: () => Promise.resolve(null),
      });

      await expect(avatarService.unlockAvatar("user1", "cat")).rejects.toThrow(
        "User not found",
      );
    });

    test("throws if already unlocked", async () => {
      const user = {
        unlockedAvatars: ["cat"],
      };

      User.findById.mockReturnValue({
        select: () => Promise.resolve(user),
      });

      await expect(avatarService.unlockAvatar("user1", "cat")).rejects.toThrow(
        "Avatar already unlocked",
      );
    });

    test("propagates yarnService error (e.g. insufficient yarns)", async () => {
      const user = {
        unlockedAvatars: [],
      };

      User.findById.mockReturnValue({
        select: () => Promise.resolve(user),
      });

      yarnService.spendYarns.mockRejectedValue(new Error("Not enough yarns"));

      await expect(avatarService.unlockAvatar("user1", "cat")).rejects.toThrow(
        "Not enough yarns",
      );
    });
  });

  // ================= EQUIP AVATAR =================
  describe("equipAvatar", () => {
    test("successfully equips owned avatar", async () => {
      const user = {
        avatarKey: null,
        unlockedAvatars: ["cat"],
        save: jest.fn(),
      };

      User.findById.mockReturnValue({
        select: () => Promise.resolve(user),
      });

      const result = await avatarService.equipAvatar("user1", "cat");

      expect(user.avatarKey).toBe("cat");
      expect(user.save).toHaveBeenCalled();

      expect(result).toEqual({ equippedKey: "cat" });
    });

    test("allows equipping free avatar without unlocking", async () => {
      const user = {
        avatarKey: null,
        unlockedAvatars: [],
        save: jest.fn(),
      };

      User.findById.mockReturnValue({
        select: () => Promise.resolve(user),
      });

      const result = await avatarService.equipAvatar("user1", "hatchling");

      expect(user.avatarKey).toBe("hatchling");
      expect(result.equippedKey).toBe("hatchling");
    });

    test("throws if avatar not owned", async () => {
      const user = {
        unlockedAvatars: [],
      };

      User.findById.mockReturnValue({
        select: () => Promise.resolve(user),
      });

      await expect(avatarService.equipAvatar("user1", "cat")).rejects.toThrow(
        "Avatar not unlocked",
      );
    });

    test("throws if avatar key invalid", async () => {
      await expect(
        avatarService.equipAvatar("user1", "invalid"),
      ).rejects.toThrow("Unknown avatar key: invalid");
    });

    test("throws if user not found", async () => {
      User.findById.mockReturnValue({
        select: () => Promise.resolve(null),
      });

      await expect(avatarService.equipAvatar("user1", "cat")).rejects.toThrow(
        "User not found",
      );
    });
  });
});
