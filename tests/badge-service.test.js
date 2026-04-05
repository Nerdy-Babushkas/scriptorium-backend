const Badge = require("../models/Badge");
const badgeService = require("../services/badge-service");

jest.mock("../models/Badge");

describe("Badge Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ================= AWARD IF NEW =================
  describe("awardIfNew", () => {
    test("returns null if badge already exists", async () => {
      Badge.findOne.mockResolvedValue({ _id: "b1" });

      const result = await badgeService.awardIfNew("user1", "streak_3");

      expect(result).toBeNull();
    });

    test("creates and saves new badge if not exists", async () => {
      Badge.findOne.mockResolvedValue(null);

      const mockSave = jest.fn().mockResolvedValue({
        key: "streak_3",
      });

      Badge.mockImplementation(() => ({
        save: mockSave,
      }));

      const result = await badgeService.awardIfNew("user1", "streak_3");

      expect(mockSave).toHaveBeenCalled();
      expect(result.key).toBe("streak_3");
    });

    test("throws error for unknown key", async () => {
      await expect(
        badgeService.awardIfNew("user1", "invalid_key"),
      ).rejects.toThrow("Unknown badge key");
    });
  });

  // ================= STREAK =================
  describe("onStreakUpdate", () => {
    test("awards correct streak badges", async () => {
      Badge.findOne.mockResolvedValue(null);

      const mockSave = jest.fn().mockResolvedValue(true);
      Badge.mockImplementation(() => ({ save: mockSave }));

      const result = await badgeService.onStreakUpdate("user1", 10, 5);

      expect(mockSave).toHaveBeenCalledTimes(2); // 3 and 7
      expect(result.length).toBe(2);
    });

    test("awards active_30_days milestone", async () => {
      Badge.findOne.mockResolvedValue(null);

      const mockSave = jest.fn().mockResolvedValue(true);
      Badge.mockImplementation(() => ({ save: mockSave }));

      const result = await badgeService.onStreakUpdate("user1", 1, 30);

      expect(result.length).toBe(1);
    });
  });

  // ================= REFLECTION =================
  describe("onReflectionCreated", () => {
    test("awards reflection badges correctly", async () => {
      Badge.findOne.mockResolvedValue(null);

      const mockSave = jest.fn().mockResolvedValue(true);
      Badge.mockImplementation(() => ({ save: mockSave }));

      const result = await badgeService.onReflectionCreated("user1", 6);

      expect(result.length).toBe(2); // 1 and 5
    });
  });

  // ================= MEDIA =================
  describe("onMediaSaved", () => {
    test("awards media badges correctly", async () => {
      Badge.findOne.mockResolvedValue(null);

      const mockSave = jest.fn().mockResolvedValue(true);
      Badge.mockImplementation(() => ({ save: mockSave }));

      const result = await badgeService.onMediaSaved("user1", 60);

      expect(result.length).toBe(3); // 1, 10, 50
    });
  });

  // ================= GOAL CREATED =================
  describe("onGoalCreated", () => {
    test("awards first goal badge", async () => {
      Badge.findOne.mockResolvedValue(null);

      const mockSave = jest.fn().mockResolvedValue(true);
      Badge.mockImplementation(() => ({ save: mockSave }));

      const result = await badgeService.onGoalCreated("user1");

      expect(result.length).toBe(1);
    });

    test("does not award if already exists", async () => {
      Badge.findOne.mockResolvedValue({ _id: "b1" });

      const result = await badgeService.onGoalCreated("user1");

      expect(result.length).toBe(0);
    });
  });

  // ================= GOAL COMPLETED =================
  describe("onGoalCompleted", () => {
    test("awards goal completion badges", async () => {
      Badge.findOne.mockResolvedValue(null);

      const mockSave = jest.fn().mockResolvedValue(true);
      Badge.mockImplementation(() => ({ save: mockSave }));

      const result = await badgeService.onGoalCompleted("user1", 5);

      expect(result.length).toBe(2); // 1 and 5
    });
  });

  // ================= USER JOINED =================
  describe("onUserJoined", () => {
    test("awards joined badge", async () => {
      Badge.findOne.mockResolvedValue(null);

      const mockSave = jest.fn().mockResolvedValue(true);
      Badge.mockImplementation(() => ({ save: mockSave }));

      const result = await badgeService.onUserJoined("user1");

      expect(result.length).toBe(1);
    });

    test("does not award if already exists", async () => {
      Badge.findOne.mockResolvedValue({ _id: "b1" });

      const result = await badgeService.onUserJoined("user1");

      expect(result.length).toBe(0);
    });
  });

  // ================= GET BADGES =================
  describe("getBadgesForUser", () => {
    test("returns badges sorted by earnedAt", async () => {
      const mockBadges = [{ key: "streak_3" }];

      Badge.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockBadges),
      });

      const result = await badgeService.getBadgesForUser("user1");

      expect(Badge.find).toHaveBeenCalledWith({ user: "user1" });
      expect(result).toEqual(mockBadges);
    });
  });

  // ================= CATALOGUE =================
  describe("getBadgeCatalogue", () => {
    test("returns badge catalogue", async () => {
      const result = await badgeService.getBadgeCatalogue();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
