// tests/avatar-routes.test.js
const request = require("supertest");
const express = require("express");

const avatarRoutes = require("../routes/avatars");
const avatarService = require("../services/avatar-service");
const { getUserFromToken } = require("../services/user-service");

jest.mock("../services/avatar-service");
jest.mock("../services/user-service");

const app = express();
app.use(express.json());
app.use("/api/avatars", avatarRoutes);

describe("Avatar Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ================= GET / =================
  describe("GET /api/avatars", () => {
    test("returns avatar state", async () => {
      getUserFromToken.mockReturnValue({ _id: "user1" });

      avatarService.getAvatarState.mockResolvedValue({
        equipped: "cat",
        catalogue: [],
      });

      const res = await request(app).get("/api/avatars");

      expect(res.status).toBe(200);
      expect(res.body.equipped).toBe("cat");

      expect(avatarService.getAvatarState).toHaveBeenCalledWith("user1");
    });

    test("returns 401 if auth fails", async () => {
      getUserFromToken.mockImplementation(() => {
        throw new Error("Unauthorized");
      });

      const res = await request(app).get("/api/avatars");

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Unauthorized");
    });
  });

  // ================= POST /unlock =================
  describe("POST /api/avatars/unlock", () => {
    test("successfully unlocks avatar", async () => {
      getUserFromToken.mockReturnValue({ _id: "user1" });

      avatarService.unlockAvatar.mockResolvedValue({
        unlockedKey: "fox",
        cost: 120,
      });

      const res = await request(app)
        .post("/api/avatars/unlock")
        .send({ key: "fox" });

      expect(res.status).toBe(200);
      expect(res.body.unlockedKey).toBe("fox");
    });

    test("returns 400 if key missing", async () => {
      getUserFromToken.mockReturnValue({ _id: "user1" });

      const res = await request(app).post("/api/avatars/unlock").send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("key is required");
    });

    test("returns 400 if not enough yarns", async () => {
      getUserFromToken.mockReturnValue({ _id: "user1" });

      avatarService.unlockAvatar.mockRejectedValue(
        new Error("Not enough yarns"),
      );

      const res = await request(app)
        .post("/api/avatars/unlock")
        .send({ key: "fox" });

      expect(res.status).toBe(400);
    });

    test("returns 409 if already unlocked", async () => {
      getUserFromToken.mockReturnValue({ _id: "user1" });

      avatarService.unlockAvatar.mockRejectedValue(
        new Error("Avatar already unlocked"),
      );

      const res = await request(app)
        .post("/api/avatars/unlock")
        .send({ key: "fox" });

      expect(res.status).toBe(409);
    });

    test("returns 404 if user not found", async () => {
      getUserFromToken.mockReturnValue({ _id: "user1" });

      avatarService.unlockAvatar.mockRejectedValue(new Error("User not found"));

      const res = await request(app)
        .post("/api/avatars/unlock")
        .send({ key: "fox" });

      expect(res.status).toBe(404);
    });

    test("returns 400 for unknown error", async () => {
      getUserFromToken.mockReturnValue({ _id: "user1" });

      avatarService.unlockAvatar.mockRejectedValue(new Error("Something else"));

      const res = await request(app)
        .post("/api/avatars/unlock")
        .send({ key: "fox" });

      expect(res.status).toBe(400);
    });
  });

  // ================= POST /equip =================
  describe("POST /api/avatars/equip", () => {
    test("successfully equips avatar", async () => {
      getUserFromToken.mockReturnValue({ _id: "user1" });

      avatarService.equipAvatar.mockResolvedValue({
        equippedKey: "fox",
      });

      const res = await request(app)
        .post("/api/avatars/equip")
        .send({ key: "fox" });

      expect(res.status).toBe(200);
      expect(res.body.equippedKey).toBe("fox");
    });

    test("returns 400 if key missing", async () => {
      getUserFromToken.mockReturnValue({ _id: "user1" });

      const res = await request(app).post("/api/avatars/equip").send({});

      expect(res.status).toBe(400);
    });

    test("returns 403 if avatar not unlocked", async () => {
      getUserFromToken.mockReturnValue({ _id: "user1" });

      avatarService.equipAvatar.mockRejectedValue(
        new Error("Avatar not unlocked"),
      );

      const res = await request(app)
        .post("/api/avatars/equip")
        .send({ key: "fox" });

      expect(res.status).toBe(403);
    });

    test("returns 404 if user not found", async () => {
      getUserFromToken.mockReturnValue({ _id: "user1" });

      avatarService.equipAvatar.mockRejectedValue(new Error("User not found"));

      const res = await request(app)
        .post("/api/avatars/equip")
        .send({ key: "fox" });

      expect(res.status).toBe(404);
    });

    test("returns 400 for other errors", async () => {
      getUserFromToken.mockReturnValue({ _id: "user1" });

      avatarService.equipAvatar.mockRejectedValue(new Error("Something else"));

      const res = await request(app)
        .post("/api/avatars/equip")
        .send({ key: "fox" });

      expect(res.status).toBe(400);
    });
  });
});
