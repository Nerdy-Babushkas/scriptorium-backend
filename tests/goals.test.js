// tests/goals.test.js

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
    getUserFromToken.mockReturnValue({ _id: "user123" });
  });

  // ================= GET GOALS =================

  test("GET /api/goals/user returns user's goals", async () => {
    goalService.getGoalsByUser.mockResolvedValue([
      { _id: "g1", title: "Goal 1", type: "book", total: 10, current: 0 },
    ]);

    const response = await request(app).get("/api/goals/user");

    expect(response.statusCode).toBe(200);
    expect(response.body.length).toBe(1);

    expect(goalService.getGoalsByUser).toHaveBeenCalledWith("user123");
  });

  // ================= CREATE GOAL =================

  test("POST /api/goals/add creates a goal", async () => {
    const goalData = { title: "Read books", type: "book", total: 5 };

    goalService.createGoal.mockResolvedValue({
      _id: "g1",
      ...goalData,
      current: 0,
    });

    const response = await request(app).post("/api/goals/add").send(goalData);

    expect(response.statusCode).toBe(200);

    expect(response.body.message).toBe("Goal created successfully");

    expect(goalService.createGoal).toHaveBeenCalledWith(
      "user123",
      expect.any(Object),
    );
  });

  // ================= UPDATE PROGRESS =================

  test("PUT /api/goals/update/:id/progress updates goal progress", async () => {
    goalService.updateGoalProgress.mockResolvedValue({
      _id: "g1",
      current: 3,
    });

    const response = await request(app)
      .put("/api/goals/update/g1/progress")
      .send({ current: 3 });

    expect(response.statusCode).toBe(200);

    expect(response.body.message).toBe("Goal updated successfully");

    expect(goalService.updateGoalProgress).toHaveBeenCalledWith(
      "user123",
      "g1",
      3,
    );
  });

  test("PUT progress returns 400 for invalid number", async () => {
    const response = await request(app)
      .put("/api/goals/update/g1/progress")
      .send({ current: "bad" });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toContain(
      "current progress must be a number",
    );
  });

  // ================= EDIT GOAL =================

  test("PUT /api/goals/update/:id edits goal", async () => {
    goalService.updateGoal.mockResolvedValue({
      _id: "g1",
      title: "Updated",
    });

    const response = await request(app).put("/api/goals/update/g1").send({
      title: "Updated",
      type: "music",
      total: 10,
      current: 2,
    });

    expect(response.statusCode).toBe(200);

    expect(response.body.message).toBe("Goal updated successfully");

    expect(goalService.updateGoal).toHaveBeenCalledWith("user123", "g1", {
      title: "Updated",
      type: "music",
      total: 10,
      current: 2,
    });
  });

  // ================= DELETE GOAL =================

  test("DELETE /api/goals/delete/:id deletes goal", async () => {
    goalService.deleteGoal.mockResolvedValue(true);

    const response = await request(app).delete("/api/goals/delete/g1");

    expect(response.statusCode).toBe(200);

    expect(response.body.message).toBe("Goal deleted successfully");

    expect(goalService.deleteGoal).toHaveBeenCalledWith("user123", "g1");
  });

  test("DELETE returns 404 if goal not found", async () => {
    goalService.deleteGoal.mockResolvedValue(false);

    const response = await request(app).delete("/api/goals/delete/unknown");

    expect(response.statusCode).toBe(404);

    expect(response.body.message).toBe("Goal not found");
  });

  // ================= AUTH ERROR =================

  test("GET /api/goals/user returns 401 if token invalid", async () => {
    getUserFromToken.mockImplementation(() => {
      throw new Error("Invalid token");
    });

    const response = await request(app).get("/api/goals/user");

    expect(response.statusCode).toBe(401);
    expect(response.body.message).toContain("Invalid token");
  });
});
