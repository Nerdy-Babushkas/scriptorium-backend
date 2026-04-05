const request = require("supertest");
const express = require("express");
const router = require("../routes/streaks");

const { getUserFromToken } = require("../services/user-service");
const streakService = require("../services/streak-service");

jest.mock("../services/user-service");
jest.mock("../services/streak-service");

const app = express();
app.use(express.json());
app.use("/api/streaks", router);

describe("Streak Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ================= GET /api/streaks =================
  describe("GET /api/streaks", () => {
    test("returns current streak", async () => {
      const mockUser = { _id: "user1" };
      const mockStreak = { current: 5 };

      getUserFromToken.mockReturnValue(mockUser);
      streakService.getStreak.mockResolvedValue(mockStreak);

      const res = await request(app).get("/api/streaks");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockStreak);

      // 🔥 important contract check
      expect(streakService.getStreak).toHaveBeenCalledWith("user1");
    });

    test("returns 401 if auth fails", async () => {
      getUserFromToken.mockImplementation(() => {
        throw new Error("Unauthorized");
      });

      const res = await request(app).get("/api/streaks");

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Unauthorized");
    });
  });

  // ================= POST /api/streaks/ping =================
  describe("POST /api/streaks/ping", () => {
    test("records activity and returns streak + badges", async () => {
      const mockUser = { _id: "user1" };
      const mockResponse = {
        streak: { current: 6 },
        newBadges: [{ key: "streak_7" }],
      };

      getUserFromToken.mockReturnValue(mockUser);
      streakService.recordActivity.mockResolvedValue(mockResponse);

      const res = await request(app).post("/api/streaks/ping");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockResponse);

      expect(streakService.recordActivity).toHaveBeenCalledWith("user1");
    });

    test("returns 401 if auth fails", async () => {
      getUserFromToken.mockImplementation(() => {
        throw new Error("Unauthorized");
      });

      const res = await request(app).post("/api/streaks/ping");

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Unauthorized");
    });
  });

  // ================= DELETE /api/streaks/reset =================
  describe("DELETE /api/streaks/reset", () => {
    test("resets streak", async () => {
      const mockUser = { _id: "user1" };
      const mockResult = { message: "Streak reset" };

      getUserFromToken.mockReturnValue(mockUser);
      streakService.resetStreak.mockResolvedValue(mockResult);

      const res = await request(app).delete("/api/streaks/reset");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockResult);

      expect(streakService.resetStreak).toHaveBeenCalledWith("user1");
    });

    test("returns 401 if auth fails", async () => {
      getUserFromToken.mockImplementation(() => {
        throw new Error("Unauthorized");
      });

      const res = await request(app).delete("/api/streaks/reset");

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Unauthorized");
    });
  });
});
