const request = require("supertest");
const express = require("express");

const router = require("../routes/yarns");
const yarnService = require("../services/yarn-service");
const { getUserFromToken } = require("../services/user-service");

jest.mock("../services/yarn-service");
jest.mock("../services/user-service");

const app = express();
app.use(express.json());
app.use("/api/yarns", router);

describe("Yarns Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ================= GET /api/yarns =================
  describe("GET /api/yarns", () => {
    test("returns yarn balance", async () => {
      getUserFromToken.mockReturnValue({ _id: "u1" });
      yarnService.getYarns.mockResolvedValue({
        balance: 50,
        lifetimeEarned: 100,
      });

      const res = await request(app).get("/api/yarns");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        balance: 50,
        lifetimeEarned: 100,
      });
    });

    test("returns 401 if auth fails", async () => {
      getUserFromToken.mockImplementation(() => {
        throw new Error("Unauthorized");
      });

      const res = await request(app).get("/api/yarns");

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Unauthorized");
    });
  });

  // ================= POST /api/yarns/spend =================
  describe("POST /api/yarns/spend", () => {
    test("spends yarns successfully", async () => {
      getUserFromToken.mockReturnValue({ _id: "u1" });

      yarnService.spendYarns.mockResolvedValue({
        balance: 20,
        lifetimeEarned: 100,
      });

      const res = await request(app)
        .post("/api/yarns/spend")
        .send({ amount: 30 });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        message: "Yarns spent successfully",
        balance: 20,
        lifetimeEarned: 100,
      });

      expect(yarnService.spendYarns).toHaveBeenCalledWith("u1", 30);
    });

    test("returns 400 for invalid amount", async () => {
      getUserFromToken.mockReturnValue({ _id: "u1" });

      const res = await request(app)
        .post("/api/yarns/spend")
        .send({ amount: 0 });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/positive number/);
    });

    test("returns 400 if not enough yarns", async () => {
      getUserFromToken.mockReturnValue({ _id: "u1" });

      yarnService.spendYarns.mockRejectedValue(new Error("Not enough yarns"));

      const res = await request(app)
        .post("/api/yarns/spend")
        .send({ amount: 50 });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Not enough yarns");
    });

    test("returns 401 for other errors", async () => {
      getUserFromToken.mockReturnValue({ _id: "u1" });

      yarnService.spendYarns.mockRejectedValue(new Error("Some other error"));

      const res = await request(app)
        .post("/api/yarns/spend")
        .send({ amount: 10 });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Some other error");
    });

    test("returns 401 if auth fails", async () => {
      getUserFromToken.mockImplementation(() => {
        throw new Error("Unauthorized");
      });

      const res = await request(app)
        .post("/api/yarns/spend")
        .send({ amount: 10 });

      expect(res.status).toBe(401);
    });
  });

  // ================= GET /api/yarns/rates =================
  describe("GET /api/yarns/rates", () => {
    test("returns yarn rates", async () => {
      getUserFromToken.mockReturnValue({ _id: "u1" });

      yarnService.YARN_RATES = {
        reflection: 10,
      };

      const res = await request(app).get("/api/yarns/rates");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        rates: yarnService.YARN_RATES,
      });
    });

    test("returns 401 if auth fails", async () => {
      getUserFromToken.mockImplementation(() => {
        throw new Error("Unauthorized");
      });

      const res = await request(app).get("/api/yarns/rates");

      expect(res.status).toBe(401);
    });
  });
});
