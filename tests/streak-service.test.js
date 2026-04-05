const Streak = require("../models/Streak");
const streakService = require("../services/streak-service");
const badgeService = require("../services/badge-service");

jest.mock("../models/Streak");
jest.mock("../services/badge-service");

describe("Streak Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper to control "today"
  const TODAY = new Date("2026-01-10T00:00:00Z");

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(TODAY);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  // ================= RECORD ACTIVITY =================
  describe("recordActivity", () => {
    test("creates new streak if none exists", async () => {
      Streak.findOne.mockResolvedValue(null);

      const mockSave = jest.fn().mockResolvedValue(true);

      Streak.mockImplementation((data) => ({
        ...data,
        save: mockSave,
      }));

      badgeService.onStreakUpdate.mockResolvedValue(["badge"]);

      const result = await streakService.recordActivity("user1");

      expect(mockSave).toHaveBeenCalled();
      expect(result.streak.current).toBe(1); // now works ✅
      expect(result.newBadges).toEqual(["badge"]);
    });

    test("does nothing if already active today", async () => {
      const streak = {
        current: 5,
        lastActiveDate: TODAY,
      };

      Streak.findOne.mockResolvedValue(streak);

      const result = await streakService.recordActivity("user1");

      expect(result.newBadges).toEqual([]);
    });

    test("increments streak on consecutive day", async () => {
      const yesterday = new Date("2026-01-09T00:00:00Z");

      const mockSave = jest.fn().mockResolvedValue(true);

      const streak = {
        current: 3,
        totalActiveDays: 3,
        graceDaysAvailable: 0,
        lastActiveDate: yesterday,
        save: mockSave,
      };

      Streak.findOne.mockResolvedValue(streak);
      badgeService.onStreakUpdate.mockResolvedValue([]);

      await streakService.recordActivity("user1");

      expect(streak.current).toBe(4);
      expect(streak.totalActiveDays).toBe(4);
      expect(mockSave).toHaveBeenCalled();
    });

    test("adds grace day every 7 streak", async () => {
      const yesterday = new Date("2026-01-09T00:00:00Z");

      const streak = {
        current: 6,
        totalActiveDays: 6,
        graceDaysAvailable: 0,
        lastActiveDate: yesterday,
        save: jest.fn(),
      };

      Streak.findOne.mockResolvedValue(streak);
      badgeService.onStreakUpdate.mockResolvedValue([]);

      await streakService.recordActivity("user1");

      expect(streak.current).toBe(7);
      expect(streak.graceDaysAvailable).toBe(1);
    });

    test("uses grace day if missed one day", async () => {
      const twoDaysAgo = new Date("2026-01-08T00:00:00Z");

      const streak = {
        current: 5,
        totalActiveDays: 5,
        graceDaysAvailable: 1,
        lastActiveDate: twoDaysAgo,
        save: jest.fn(),
      };

      Streak.findOne.mockResolvedValue(streak);
      badgeService.onStreakUpdate.mockResolvedValue([]);

      await streakService.recordActivity("user1");

      expect(streak.current).toBe(6);
      expect(streak.graceDaysAvailable).toBe(0);
    });

    test("resets streak if broken", async () => {
      const oldDate = new Date("2026-01-05T00:00:00Z");

      const streak = {
        current: 10,
        totalActiveDays: 10,
        graceDaysAvailable: 0,
        lastActiveDate: oldDate,
        save: jest.fn(),
      };

      Streak.findOne.mockResolvedValue(streak);
      badgeService.onStreakUpdate.mockResolvedValue([]);

      await streakService.recordActivity("user1");

      expect(streak.current).toBe(1);
      expect(streak.totalActiveDays).toBe(11);
    });
  });

  // ================= GET STREAK =================
  describe("getStreak", () => {
    test("returns empty streak if none exists", async () => {
      Streak.findOne.mockResolvedValue(null);

      const result = await streakService.getStreak("user1");

      expect(result.current).toBe(0);
      expect(result.longest).toBe(0);
    });

    test("resets stale streak (no grace)", async () => {
      const oldDate = new Date("2026-01-05T00:00:00Z");

      const streak = {
        current: 5,
        graceDaysAvailable: 0,
        lastActiveDate: oldDate,
        save: jest.fn(),
      };

      Streak.findOne.mockResolvedValue(streak);

      const result = await streakService.getStreak("user1");

      expect(result.current).toBe(0);
      expect(streak.save).toHaveBeenCalled();
    });

    test("resets streak if diff > 2", async () => {
      const oldDate = new Date("2026-01-05T00:00:00Z");

      const streak = {
        current: 5,
        graceDaysAvailable: 2,
        lastActiveDate: oldDate,
        save: jest.fn(),
      };

      Streak.findOne.mockResolvedValue(streak);

      const result = await streakService.getStreak("user1");

      expect(result.current).toBe(0);
    });

    test("does not reset if within grace window", async () => {
      const yesterday = new Date("2026-01-09T00:00:00Z");

      const streak = {
        current: 5,
        graceDaysAvailable: 1,
        lastActiveDate: yesterday,
        save: jest.fn(),
      };

      Streak.findOne.mockResolvedValue(streak);

      const result = await streakService.getStreak("user1");

      expect(result.current).toBe(5);
    });
  });

  // ================= RESET =================
  describe("resetStreak", () => {
    test("deletes streak", async () => {
      Streak.findOneAndDelete.mockResolvedValue(true);

      const result = await streakService.resetStreak("user1");

      expect(Streak.findOneAndDelete).toHaveBeenCalledWith({
        user: "user1",
      });

      expect(result.message).toBe("Streak reset");
    });
  });
});
