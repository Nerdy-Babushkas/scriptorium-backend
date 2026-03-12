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

      const goalData = { title: "Goal 1", type: "daily", total: 10 };
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

    test("updates goal progress and marks completed if reached total", async () => {
      const mockSave = jest.fn().mockResolvedValue(true);
      const goal = { _id: "g1", current: 0, total: 10, save: mockSave };
      Goal.findOne.mockResolvedValue(goal);

      const result = await goalService.updateGoalProgress("user1", "g1", 10);

      expect(goal.current).toBe(10);
      expect(goal.status).toBe("completed");
      expect(mockSave).toHaveBeenCalled();
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
