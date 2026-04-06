const Yarn = require("../models/Yarn");
const yarnService = require("../services/yarn-service");

jest.mock("../models/Yarn");

describe("Yarn Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ================= INTERNAL ADD (via triggers) =================
  describe("earning yarns", () => {
    test("onReflectionWritten adds correct amount", async () => {
      Yarn.findOneAndUpdate.mockResolvedValue({ balance: 10 });

      const result = await yarnService.onReflectionWritten("u1");

      expect(Yarn.findOneAndUpdate).toHaveBeenCalledWith(
        { user: "u1" },
        expect.objectContaining({
          $inc: { balance: 10, lifetimeEarned: 10 },
        }),
        expect.any(Object),
      );
      expect(result.balance).toBe(10);
    });

    test("onGoalProgressUpdated adds correct amount", async () => {
      Yarn.findOneAndUpdate.mockResolvedValue({ balance: 5 });

      const result = await yarnService.onGoalProgressUpdated("u1");

      expect(result.balance).toBe(5);
    });

    test("onGoalCompleted adds correct amount", async () => {
      Yarn.findOneAndUpdate.mockResolvedValue({ balance: 25 });

      const result = await yarnService.onGoalCompleted("u1");

      expect(result.balance).toBe(25);
    });

    test("onStreakMilestone adds correct amount", async () => {
      Yarn.findOneAndUpdate.mockResolvedValue({ balance: 15 });

      const result = await yarnService.onStreakMilestone("u1");

      expect(result.balance).toBe(15);
    });

    test("onBadgeEarned multiplies by badge count", async () => {
      Yarn.findOneAndUpdate.mockResolvedValue({ balance: 40 });

      const result = await yarnService.onBadgeEarned("u1", 2);

      expect(Yarn.findOneAndUpdate).toHaveBeenCalledWith(
        { user: "u1" },
        expect.objectContaining({
          $inc: { balance: 40, lifetimeEarned: 40 },
        }),
        expect.any(Object),
      );
      expect(result.balance).toBe(40);
    });

    test("onBadgeEarned returns null if badgeCount invalid", async () => {
      const result = await yarnService.onBadgeEarned("u1", 0);
      expect(result).toBeNull();
    });
  });

  // ================= SPEND =================
  describe("spendYarns", () => {
    test("throws if amount is invalid", async () => {
      await expect(yarnService.spendYarns("u1", 0)).rejects.toThrow(
        "Amount must be positive",
      );
    });

    test("throws if user has no yarn doc", async () => {
      Yarn.findOne.mockResolvedValue(null);

      await expect(yarnService.spendYarns("u1", 10)).rejects.toThrow(
        "Not enough yarns",
      );
    });

    test("throws if not enough balance", async () => {
      Yarn.findOne.mockResolvedValue({ balance: 5 });

      await expect(yarnService.spendYarns("u1", 10)).rejects.toThrow(
        "Not enough yarns",
      );
    });

    test("deducts balance and saves", async () => {
      const mockSave = jest.fn().mockResolvedValue({ balance: 5 });

      const yarnDoc = {
        balance: 10,
        save: mockSave,
      };

      Yarn.findOne.mockResolvedValue(yarnDoc);

      const result = await yarnService.spendYarns("u1", 5);

      expect(yarnDoc.balance).toBe(5);
      expect(mockSave).toHaveBeenCalled();
      expect(result.balance).toBe(5);
    });
  });

  // ================= GET =================
  describe("getYarns", () => {
    test("returns default if no yarn doc", async () => {
      Yarn.findOne.mockResolvedValue(null);

      const result = await yarnService.getYarns("u1");

      expect(result).toEqual({ balance: 0, lifetimeEarned: 0 });
    });

    test("returns yarn doc if exists", async () => {
      const yarnDoc = { balance: 50, lifetimeEarned: 100 };

      Yarn.findOne.mockResolvedValue(yarnDoc);

      const result = await yarnService.getYarns("u1");

      expect(result).toBe(yarnDoc);
    });
  });
});
