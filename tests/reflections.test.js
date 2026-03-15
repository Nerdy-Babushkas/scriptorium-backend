// tests/reflection.test.js

const request = require("supertest");
const express = require("express");

const reflectionRouter = require("../routes/reflections");

jest.mock("../services/reflection-service");
jest.mock("../services/user-service");

const reflectionService = require("../services/reflection-service");
const { getUserFromToken } = require("../services/user-service");

const app = express();
app.use(express.json());
app.use("/api/reflection", reflectionRouter);

describe("Reflection Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ================= ADD REFLECTION =================
  test("POST /api/reflection/add adds a reflection", async () => {
    getUserFromToken.mockReturnValue({ _id: "user1" });

    const reflectionData = {
      itemId: "item1",
      itemType: "book",
      text: "This is a reflection long enough to pass validation rules.",
      moodTags: ["happy"],
      feelings: ["content"],
    };

    reflectionService.createReflection.mockResolvedValue({
      _id: "r1",
      ...reflectionData,
      user: "user1",
    });

    const response = await request(app)
      .post("/api/reflection/add")
      .send(reflectionData);

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Reflection added successfully");
    expect(reflectionService.createReflection).toHaveBeenCalled();
  });

  test("POST /api/reflection/add without required fields returns 400", async () => {
    getUserFromToken.mockReturnValue({ _id: "user1" });

    const response = await request(app).post("/api/reflection/add").send({
      text: "Too short",
    });

    expect(response.statusCode).toBe(400);
  });

  // ================= GET ALL USER REFLECTIONS =================
  test("GET /api/reflection/user returns user's reflections", async () => {
    getUserFromToken.mockReturnValue({ _id: "user1" });

    reflectionService.getUserReflections.mockResolvedValue([
      { _id: "r1", text: "Reflection 1", user: "user1" },
    ]);

    const response = await request(app).get("/api/reflection/user");

    expect(response.statusCode).toBe(200);
    // Access the reflections array
    expect(response.body.reflections.length).toBe(1);
    expect(response.body.total).toBe(1);
    expect(response.body.page).toBe(1);
  });

  // ================= GET REFLECTIONS FOR ITEM =================
  test("GET /api/reflection/item/:itemId returns filtered reflections", async () => {
    getUserFromToken.mockReturnValue({ _id: "user1" });

    reflectionService.getReflectionsByItem.mockResolvedValue([
      { _id: "r1", user: "user1" },
      { _id: "r2", user: "user2" },
    ]);

    const response = await request(app).get(
      "/api/reflection/item/item1?itemType=book",
    );

    expect(response.statusCode).toBe(200);
    expect(response.body.length).toBe(1);
    expect(response.body[0]._id).toBe("r1");
  });

  // ================= GET SPECIFIC REFLECTION =================
  test("GET /api/reflection/:id returns reflection", async () => {
    getUserFromToken.mockReturnValue({ _id: "user1" });

    reflectionService.getReflectionById.mockResolvedValue({
      _id: "r1",
      user: "user1",
      text: "Reflection text",
    });

    const response = await request(app).get("/api/reflection/r1");

    expect(response.statusCode).toBe(200);
    expect(response.body._id).toBe("r1");
  });

  test("GET /api/reflection/:id denies access if user mismatch", async () => {
    getUserFromToken.mockReturnValue({ _id: "user1" });

    reflectionService.getReflectionById.mockResolvedValue({
      _id: "r1",
      user: "user2",
      text: "Reflection text",
    });

    const response = await request(app).get("/api/reflection/r1");

    expect(response.statusCode).toBe(403);
  });

  // ================= UPDATE REFLECTION =================
  test("PUT /api/reflection/update/:id updates reflection", async () => {
    getUserFromToken.mockReturnValue({ _id: "user1" });

    reflectionService.getReflectionById.mockResolvedValue({
      _id: "r1",
      user: "user1",
      text: "Old text",
    });

    reflectionService.updateReflection.mockResolvedValue({
      _id: "r1",
      text: "Updated text",
      user: "user1",
    });

    const response = await request(app)
      .put("/api/reflection/update/r1")
      .send({ text: "Updated text" });

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Reflection updated successfully");
  });

  // ================= REMOVE REFLECTION =================
  test("DELETE /api/reflection/remove/:id removes reflection", async () => {
    getUserFromToken.mockReturnValue({ _id: "user1" });

    reflectionService.getReflectionById.mockResolvedValue({
      _id: "r1",
      user: "user1",
    });

    reflectionService.removeReflection.mockResolvedValue({
      message: "Removed",
    });

    const response = await request(app).delete("/api/reflection/remove/r1");

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Removed");
  });
});
