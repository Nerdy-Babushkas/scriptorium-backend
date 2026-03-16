// tests/goal-service.test.js
const Goal = require("../models/Goal");
const goalService = require("../services/goal-service");

jest.mock("../models/Goal");

describe("Goal Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ================= GET GOALS =================
  describe("getGoalsByUser", () => {
    test("returns goals for a user", async () => {
      const mockGoals = [{ _id: "g1", title: "Goal 1" }];
      Goal.find.mockResolvedValue(mockGoals);

      const result = await goalService.getGoalsByUser("user1");

      expect(Goal.find).toHaveBeenCalledWith({ user: "user1" });
      expect(result).toEqual(mockGoals);
    });
  });

  // ================= CREATE GOAL =================
  describe("createGoal", () => {
    test("creates and saves a new goal", async () => {
      const mockSave = jest
        .fn()
        .mockResolvedValue({ _id: "g1", title: "Goal 1" });

      Goal.mockImplementation(() => ({ save: mockSave }));

      const goalData = { title: "Goal 1", type: "book", total: 10 };

      const result = await goalService.createGoal("user1", goalData);

      expect(mockSave).toHaveBeenCalled();
      expect(result.title).toBe("Goal 1");
    });
  });

  // ================= UPDATE GOAL PROGRESS =================
  describe("updateGoalProgress", () => {
    test("returns null if goal not found", async () => {
      Goal.findOne.mockResolvedValue(null);

      const result = await goalService.updateGoalProgress("user1", "g1", 5);

      expect(result).toBeNull();
    });

    test("updates goal progress", async () => {
      const mockSave = jest.fn().mockResolvedValue(true);

      const goal = {
        _id: "g1",
        current: 0,
        total: 10,
        save: mockSave,
      };

      Goal.findOne.mockResolvedValue(goal);

      await goalService.updateGoalProgress("user1", "g1", 4);

      expect(goal.current).toBe(4);
      expect(goal.status).toBe("active");
      expect(mockSave).toHaveBeenCalled();
    });

    test("marks goal completed if current >= total", async () => {
      const mockSave = jest.fn().mockResolvedValue(true);

      const goal = {
        _id: "g1",
        current: 0,
        total: 10,
        save: mockSave,
      };

      Goal.findOne.mockResolvedValue(goal);

      await goalService.updateGoalProgress("user1", "g1", 10);

      expect(goal.current).toBe(10);
      expect(goal.status).toBe("completed");
      expect(mockSave).toHaveBeenCalled();
    });

    test("clamps progress above total", async () => {
      const mockSave = jest.fn().mockResolvedValue(true);

      const goal = {
        _id: "g1",
        current: 0,
        total: 10,
        save: mockSave,
      };

      Goal.findOne.mockResolvedValue(goal);

      await goalService.updateGoalProgress("user1", "g1", 50);

      expect(goal.current).toBe(10);
    });

    test("clamps progress below zero", async () => {
      const mockSave = jest.fn().mockResolvedValue(true);

      const goal = {
        _id: "g1",
        current: 0,
        total: 10,
        save: mockSave,
      };

      Goal.findOne.mockResolvedValue(goal);

      await goalService.updateGoalProgress("user1", "g1", -5);

      expect(goal.current).toBe(0);
    });
  });

  // ================= UPDATE GOAL =================
  describe("updateGoal", () => {
    test("returns null if goal not found", async () => {
      Goal.findOne.mockResolvedValue(null);

      const result = await goalService.updateGoal("user1", "g1", {
        title: "Updated",
      });

      expect(result).toBeNull();
    });

    test("updates goal fields", async () => {
      const mockSave = jest.fn().mockResolvedValue(true);

      const goal = {
        _id: "g1",
        title: "Old",
        type: "book",
        total: 10,
        current: 2,
        save: mockSave,
      };

      Goal.findOne.mockResolvedValue(goal);

      await goalService.updateGoal("user1", "g1", {
        title: "New Title",
        type: "music",
        total: 20,
        current: 5,
      });

      expect(goal.title).toBe("New Title");
      expect(goal.type).toBe("music");
      expect(goal.total).toBe(20);
      expect(goal.current).toBe(5);
      expect(mockSave).toHaveBeenCalled();
    });

    test("updates status when completed", async () => {
      const mockSave = jest.fn().mockResolvedValue(true);

      const goal = {
        _id: "g1",
        total: 10,
        current: 5,
        save: mockSave,
      };

      Goal.findOne.mockResolvedValue(goal);

      await goalService.updateGoal("user1", "g1", {
        current: 10,
      });

      expect(goal.status).toBe("completed");
    });
  });

  // ================= DELETE GOAL =================
  describe("deleteGoal", () => {
    test("deletes the goal if found", async () => {
      const mockGoal = { _id: "g1" };

      Goal.findOneAndDelete.mockResolvedValue(mockGoal);

      const result = await goalService.deleteGoal("user1", "g1");

      expect(Goal.findOneAndDelete).toHaveBeenCalledWith({
        _id: "g1",
        user: "user1",
      });

      expect(result).toEqual(mockGoal);
    });

    test("returns null if goal not found", async () => {
      Goal.findOneAndDelete.mockResolvedValue(null);

      const result = await goalService.deleteGoal("user1", "g1");

      expect(result).toBeNull();
    });
  });
});
