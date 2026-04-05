const request = require("supertest");
const express = require("express");
const router = require("../routes/badges");

const { getUserFromToken } = require("../services/user-service");
const badgeService = require("../services/badge-service");

jest.mock("../services/user-service");
jest.mock("../services/badge-service");

const app = express();
app.use(express.json());
app.use("/api/badges", router);

describe("Badge Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ================= GET /api/badges =================
  describe("GET /api/badges", () => {
    test("returns user badges", async () => {
      const mockUser = { _id: "user1" };
      const mockBadges = [{ key: "streak_3" }];

      getUserFromToken.mockReturnValue(mockUser);
      badgeService.getBadgesForUser.mockResolvedValue(mockBadges);

      const res = await request(app).get("/api/badges");

      expect(res.status).toBe(200);
      expect(res.body.badges).toEqual(mockBadges);
      expect(res.body.total).toBe(1);
    });

    test("returns 401 if auth fails", async () => {
      getUserFromToken.mockImplementation(() => {
        throw new Error("Unauthorized");
      });

      const res = await request(app).get("/api/badges");

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Unauthorized");
    });
  });

  // ================= GET /api/badges/catalogue =================
  describe("GET /api/badges/catalogue", () => {
    test("returns badge catalogue", async () => {
      const mockCatalogue = [{ key: "streak_3" }];

      badgeService.getBadgeCatalogue.mockResolvedValue(mockCatalogue);

      const res = await request(app).get("/api/badges/catalogue");

      expect(res.status).toBe(200);
      expect(res.body.catalogue).toEqual(mockCatalogue);
    });

    test("handles errors", async () => {
      badgeService.getBadgeCatalogue.mockRejectedValue(
        new Error("Something broke"),
      );

      const res = await request(app).get("/api/badges/catalogue");

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Something broke");
    });
  });

  // ================= POST /api/badges/award =================
  describe("POST /api/badges/award", () => {
    test("awards badge successfully", async () => {
      const mockUser = { _id: "user1" };
      const mockBadge = { key: "streak_7" };

      getUserFromToken.mockReturnValue(mockUser);
      badgeService.awardIfNew.mockResolvedValue(mockBadge);

      const res = await request(app)
        .post("/api/badges/award")
        .send({ key: "streak_7" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Badge awarded");
      expect(res.body.badge).toEqual(mockBadge);
    });

    test("returns already owned if badge exists", async () => {
      const mockUser = { _id: "user1" };

      getUserFromToken.mockReturnValue(mockUser);
      badgeService.awardIfNew.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/badges/award")
        .send({ key: "streak_7" });

      expect(res.status).toBe(200);
      expect(res.body.alreadyOwned).toBe(true);
    });

    test("returns 400 if key missing", async () => {
      const mockUser = { _id: "user1" };
      getUserFromToken.mockReturnValue(mockUser);

      const res = await request(app).post("/api/badges/award").send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("key is required");
    });

    test("handles errors", async () => {
      const mockUser = { _id: "user1" };

      getUserFromToken.mockReturnValue(mockUser);
      badgeService.awardIfNew.mockRejectedValue(new Error("Invalid badge"));

      const res = await request(app)
        .post("/api/badges/award")
        .send({ key: "bad_key" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid badge");
    });
  });
});
