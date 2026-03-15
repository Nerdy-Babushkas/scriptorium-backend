const request = require("supertest");
const express = require("express");

const goalsRouter = require("../routes/goals");

jest.mock("../services/goal-service");
jest.mock("../services/user-service");

const goalService = require("../services/goal-service");
const { getUserFromToken } = require("../services/user-service");

const app = express();
app.use(express.json());
app.use("/api/goals", goalsRouter);

describe("Goals Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock: assume a valid user is logged in for every test
    getUserFromToken.mockReturnValue({ _id: "user123" });
  });

  // ==========================
  // AUTHENTICATED ROUTES
  // ==========================

  test("GET /api/goals/user returns user's goals", async () => {
    goalService.getGoalsByUser.mockResolvedValue([
      { _id: "g1", title: "Goal 1", type: "habit", total: 10, current: 0 },
    ]);

    const response = await request(app).get("/api/goals/user");

    expect(response.statusCode).toBe(200);
    expect(response.body.length).toBe(1);
    expect(goalService.getGoalsByUser).toHaveBeenCalledWith("user123");
  });

  test("POST /api/goals/add creates a goal", async () => {
    const goalData = { title: "Read books", type: "habit", total: 5 };

    goalService.createGoal.mockResolvedValue({
      _id: "g1",
      ...goalData,
      current: 0,
    });

    const response = await request(app).post("/api/goals/add").send(goalData);

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Goal created successfully");
    // Verify it called the service with the ID from the TOKEN, not the URL
    expect(goalService.createGoal).toHaveBeenCalledWith(
      "user123",
      expect.any(Object),
    );
  });

  test("PUT /api/goals/update/:id updates goal progress", async () => {
    goalService.updateGoalProgress.mockResolvedValue({
      _id: "g1",
      current: 3,
    });

    const response = await request(app)
      .put("/api/goals/update/g1")
      .send({ current: 3 });

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Goal updated successfully");
    expect(goalService.updateGoalProgress).toHaveBeenCalledWith(
      "user123",
      "g1",
      3,
    );
  });

  test("DELETE /api/goals/delete/:id deletes goal", async () => {
    goalService.deleteGoal.mockResolvedValue(true);

    const response = await request(app).delete("/api/goals/delete/g1");

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Goal deleted successfully");
    expect(goalService.deleteGoal).toHaveBeenCalledWith("user123", "g1");
  });

  test("DELETE /api/goals/delete/:id returns 404 if goal not found", async () => {
    goalService.deleteGoal.mockResolvedValue(false);

    const response = await request(app).delete("/api/goals/delete/unknown");

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe("Goal not found");
  });

  // ==========================
  // AUTH ERROR CASE
  // ==========================

  test("GET /api/goals/user returns 401 if token is invalid", async () => {
    // Override the default mock to throw an error
    getUserFromToken.mockImplementation(() => {
      throw new Error("Invalid token");
    });

    const response = await request(app).get("/api/goals/user");

    expect(response.statusCode).toBe(401);
    expect(response.body.message).toContain("Invalid token");
  });
});
