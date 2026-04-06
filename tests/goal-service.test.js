// tests/goal-service.test.js
const Goal = require("../models/Goal");
const goalService = require("../services/goal-service");

jest.mock("../models/Goal");
jest.mock("../services/badge-service");
jest.mock("../services/streak-service");
jest.mock("../services/yarn-service");

const badgeService = require("../services/badge-service");
const streakService = require("../services/streak-service");
const yarnService = require("../services/yarn-service");

describe("Goal Service - Extended Coverage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ================= CREATE GOAL =================
  describe("createGoal (gamification)", () => {
    test("attaches badges and yarns", async () => {
      const mockSave = jest.fn().mockResolvedValue({});
      Goal.mockImplementation(() => ({ save: mockSave }));

      streakService.recordActivity.mockResolvedValue({
        newBadges: ["s1"],
      });
      badgeService.onGoalCreated.mockResolvedValue(["g1"]);
      yarnService.onBadgeEarned.mockResolvedValue(10);

      const result = await goalService.createGoal("user1", {});

      expect(result._newBadges).toEqual(["s1", "g1"]);
      expect(result._yarns).toBe(10);
    });

    test("no badges → no yarn call", async () => {
      const mockSave = jest.fn().mockResolvedValue({});
      Goal.mockImplementation(() => ({ save: mockSave }));

      streakService.recordActivity.mockResolvedValue({
        newBadges: [],
      });
      badgeService.onGoalCreated.mockResolvedValue([]);

      const result = await goalService.createGoal("user1", {});

      expect(yarnService.onBadgeEarned).not.toHaveBeenCalled();
      expect(result._newBadges).toEqual([]);
      expect(result._yarns).toBeNull();
    });

    test("handles gamification error", async () => {
      const mockSave = jest.fn().mockResolvedValue({});
      Goal.mockImplementation(() => ({ save: mockSave }));

      streakService.recordActivity.mockRejectedValue(new Error("fail"));

      const result = await goalService.createGoal("user1", {});

      expect(result._newBadges).toEqual([]);
      expect(result._yarns).toBeNull();
    });
  });

  // ================= UPDATE PROGRESS =================
  describe("updateGoalProgress (gamification)", () => {
    test("already completed → no completion trigger", async () => {
      const goal = {
        _id: "g1",
        current: 10,
        total: 10,
        status: "completed",
        save: jest.fn(),
      };

      Goal.findOne.mockResolvedValue(goal);

      streakService.recordActivity.mockResolvedValue({
        newBadges: [],
      });

      await goalService.updateGoalProgress("user1", "g1", 10);

      expect(badgeService.onGoalCompleted).not.toHaveBeenCalled();
      expect(yarnService.onGoalCompleted).not.toHaveBeenCalled();
    });

    test("just completed → triggers completion logic", async () => {
      const goal = {
        _id: "g1",
        current: 5,
        total: 10,
        status: "active",
        save: jest.fn(),
      };

      Goal.findOne.mockResolvedValue(goal);
      Goal.countDocuments.mockResolvedValue(3);

      streakService.recordActivity.mockResolvedValue({
        newBadges: ["s1"],
      });

      badgeService.onGoalCompleted.mockResolvedValue(["c1"]);

      yarnService.onGoalProgressUpdated.mockResolvedValue(1);
      yarnService.onGoalCompleted.mockResolvedValue(2);
      yarnService.onBadgeEarned.mockResolvedValue(3);

      const result = await goalService.updateGoalProgress("user1", "g1", 10);

      expect(badgeService.onGoalCompleted).toHaveBeenCalledWith("user1", 3);

      expect(result._newBadges).toEqual(["s1", "c1"]);
    });

    test("no badges → no badge yarn", async () => {
      const goal = {
        _id: "g1",
        current: 2,
        total: 10,
        status: "active",
        save: jest.fn(),
      };

      Goal.findOne.mockResolvedValue(goal);

      streakService.recordActivity.mockResolvedValue({
        newBadges: [],
      });

      yarnService.onGoalProgressUpdated.mockResolvedValue(1);

      await goalService.updateGoalProgress("user1", "g1", 3);

      expect(yarnService.onBadgeEarned).not.toHaveBeenCalled();
    });

    test("handles gamification failure", async () => {
      const goal = {
        _id: "g1",
        current: 2,
        total: 10,
        status: "active",
        save: jest.fn(),
      };

      Goal.findOne.mockResolvedValue(goal);

      streakService.recordActivity.mockRejectedValue(new Error("fail"));

      const result = await goalService.updateGoalProgress("user1", "g1", 5);

      expect(result._newBadges).toEqual([]);
      expect(result._yarns).toBeNull();
    });
  });

  // ================= UPDATE GOAL =================
  describe("updateGoal (extra branches)", () => {
    test("partial update does not overwrite other fields", async () => {
      const goal = {
        _id: "g1",
        title: "Old",
        type: "book",
        total: 10,
        current: 2,
        status: "active",
        save: jest.fn(),
      };

      Goal.findOne.mockResolvedValue(goal);

      streakService.recordActivity.mockResolvedValue({
        newBadges: [],
      });

      yarnService.onGoalProgressUpdated.mockResolvedValue(1);

      await goalService.updateGoal("user1", "g1", {
        title: "New",
      });

      expect(goal.title).toBe("New");
      expect(goal.type).toBe("book");
    });

    test("clamps current inside updateGoal", async () => {
      const goal = {
        _id: "g1",
        total: 10,
        current: 2,
        status: "active",
        save: jest.fn(),
      };

      Goal.findOne.mockResolvedValue(goal);

      streakService.recordActivity.mockResolvedValue({
        newBadges: [],
      });

      yarnService.onGoalProgressUpdated.mockResolvedValue(1);

      await goalService.updateGoal("user1", "g1", {
        current: 50,
      });

      expect(goal.current).toBe(10);
    });

    test("justCompleted triggers completion logic", async () => {
      const goal = {
        _id: "g1",
        total: 10,
        current: 5,
        status: "active",
        save: jest.fn(),
      };

      Goal.findOne.mockResolvedValue(goal);
      Goal.countDocuments.mockResolvedValue(2);

      streakService.recordActivity.mockResolvedValue({
        newBadges: [],
      });

      badgeService.onGoalCompleted.mockResolvedValue(["badge"]);

      yarnService.onGoalProgressUpdated.mockResolvedValue(1);
      yarnService.onGoalCompleted.mockResolvedValue(2);

      const result = await goalService.updateGoal("user1", "g1", {
        current: 10,
      });

      expect(result._newBadges).toEqual(["badge"]);
    });

    test("handles gamification error", async () => {
      const goal = {
        _id: "g1",
        total: 10,
        current: 2,
        status: "active",
        save: jest.fn(),
      };

      Goal.findOne.mockResolvedValue(goal);

      streakService.recordActivity.mockRejectedValue(new Error("fail"));

      const result = await goalService.updateGoal("user1", "g1", {
        current: 3,
      });

      expect(result._newBadges).toEqual([]);
      expect(result._yarns).toBeNull();
    });
  });
});
