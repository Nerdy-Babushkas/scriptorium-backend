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
  });

  // ==========================
  // Existing JWT routes
  // ==========================

  test("GET /api/goals/user returns user's goals", async () => {
    getUserFromToken.mockReturnValue({ _id: "user1" });

    goalService.getGoalsByUser.mockResolvedValue([
      { _id: "g1", title: "Goal 1", type: "habit", total: 10, current: 0 },
    ]);

    const response = await request(app).get("/api/goals/user");

    expect(response.statusCode).toBe(200);
    expect(response.body.length).toBe(1);
  });

  test("POST /api/goals/add creates a goal", async () => {
    getUserFromToken.mockReturnValue({ _id: "user1" });

    const goalData = { title: "Read books", type: "habit", total: 5 };

    goalService.createGoal.mockResolvedValue({
      _id: "g1",
      ...goalData,
      current: 0,
    });

    const response = await request(app).post("/api/goals/add").send(goalData);

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Goal created successfully");
    expect(goalService.createGoal).toHaveBeenCalled();
  });

  test("PUT /api/goals/update/:id updates goal progress", async () => {
    getUserFromToken.mockReturnValue({ _id: "user1" });

    goalService.updateGoalProgress.mockResolvedValue({
      _id: "g1",
      title: "Read books",
      type: "habit",
      total: 5,
      current: 3,
    });

    const response = await request(app)
      .put("/api/goals/update/g1")
      .send({ current: 3 });

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Goal updated successfully");
  });

  // ==========================
  // New userId-based routes
  // ==========================

  test("GET /api/goals/user/:userId returns goals", async () => {
    goalService.getGoalsByUser.mockResolvedValue([
      { _id: "g1", title: "Goal A" },
    ]);

    const response = await request(app).get("/api/goals/user/user123");

    expect(response.statusCode).toBe(200);
    expect(response.body.length).toBe(1);
  });

  test("POST /api/goals/add/:userId creates a goal for userId", async () => {
    const goalData = { title: "Exercise", type: "habit", total: 10 };

    goalService.createGoal.mockResolvedValue({
      _id: "g2",
      ...goalData,
      current: 0,
    });

    const response = await request(app)
      .post("/api/goals/add/user123")
      .send(goalData);

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Goal created successfully");
  });

  test("PUT /api/goals/update/:id/:userId updates goal progress for userId", async () => {
    goalService.updateGoalProgress.mockResolvedValue({
      _id: "g2",
      title: "Exercise",
      type: "habit",
      total: 10,
      current: 7,
    });

    const response = await request(app)
      .put("/api/goals/update/g2/user123")
      .send({ current: 7 });

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Goal updated successfully");
  });

  test("DELETE /api/goals/delete/:id/:userId deletes goal for userId", async () => {
    goalService.deleteGoal.mockResolvedValue(true);

    const response = await request(app).delete("/api/goals/delete/g2/user123");

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Goal deleted successfully");
  });

  test("DELETE /api/goals/delete/:id/:userId returns 404 if goal not found", async () => {
    goalService.deleteGoal.mockResolvedValue(false);

    const response = await request(app).delete(
      "/api/goals/delete/unknown/user123",
    );

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe("Goal not found");
  });
});
