const request = require("supertest");
const express = require("express");

const userRouter = require("../routes/user");

jest.mock("../services/user-service");
jest.mock("../services/email-service");
jest.mock("../services/password-reset-service");
jest.mock("jsonwebtoken");

const userService = require("../services/user-service");
const emailService = require("../services/email-service");
const passwordResetService = require("../services/password-reset-service");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());
app.use("/api/user", userRouter);

test("POST /api/user/register registers a user", async () => {
  userService.registerUser.mockResolvedValue({
    verificationToken: "token123",
    userEmail: "test@test.com",
    message: "User registered",
  });

  emailService.sendVerificationEmail.mockResolvedValue();

  const response = await request(app).post("/api/user/register").send({
    userName: "test",
    email: "test@test.com",
    password: "123456",
  });

  expect(response.statusCode).toBe(200);
  expect(response.body.message).toBe("User registered");

  expect(emailService.sendVerificationEmail).toHaveBeenCalled();
});

test("POST /api/user/register returns error if registration fails", async () => {
  userService.registerUser.mockRejectedValue(new Error("Email already exists"));

  const response = await request(app)
    .post("/api/user/register")
    .send({ email: "test@test.com" });

  expect(response.statusCode).toBe(422);
  expect(response.body.message).toBe("Email already exists");
});

test("GET /api/user/verify verifies email", async () => {
  userService.verifyEmail.mockResolvedValue({
    userName: "maks",
  });

  const response = await request(app).get("/api/user/verify?token=abc123");

  expect(response.statusCode).toBe(200);
  expect(response.body.message).toBe("Email successfully verified!");
});

test("GET /api/user/verify returns error for invalid token", async () => {
  userService.verifyEmail.mockRejectedValue(new Error("Invalid token"));

  const response = await request(app).get("/api/user/verify?token=badtoken");

  expect(response.statusCode).toBe(400);
});

test("POST /api/user/login returns JWT token", async () => {
  userService.checkUser.mockResolvedValue({
    _id: "user1",
    userName: "maks",
    email: "maks@test.com",
  });

  jwt.sign.mockReturnValue("fake-jwt-token");

  const response = await request(app).post("/api/user/login").send({
    email: "maks@test.com",
    password: "123",
  });

  expect(response.statusCode).toBe(200);
  expect(response.body.token).toBe("fake-jwt-token");
});

test("POST /api/user/login fails with wrong credentials", async () => {
  userService.checkUser.mockRejectedValue(new Error("Invalid credentials"));

  const response = await request(app).post("/api/user/login").send({
    email: "bad@test.com",
    password: "wrong",
  });

  expect(response.statusCode).toBe(422);
});

test("POST /api/user/forgot-password sends reset email", async () => {
  passwordResetService.requestPasswordReset.mockResolvedValue({
    message: "Reset email sent",
  });

  const response = await request(app).post("/api/user/forgot-password").send({
    email: "test@test.com",
  });

  expect(response.statusCode).toBe(200);
  expect(response.body.message).toBe("Reset email sent");
});

test("POST /api/user/forgot-password returns error", async () => {
  passwordResetService.requestPasswordReset.mockRejectedValue(
    new Error("User not found"),
  );

  const response = await request(app).post("/api/user/forgot-password").send({
    email: "missing@test.com",
  });

  expect(response.statusCode).toBe(400);
});

test("POST /api/user/reset-password resets password", async () => {
  passwordResetService.resetPassword.mockResolvedValue({
    message: "Password updated",
  });

  const response = await request(app).post("/api/user/reset-password").send({
    token: "abc",
    password: "123",
    password2: "123",
  });

  expect(response.statusCode).toBe(200);
  expect(response.body.message).toBe("Password updated");
});

test("POST /api/user/reset-password returns error", async () => {
  passwordResetService.resetPassword.mockRejectedValue(
    new Error("Invalid token"),
  );

  const response = await request(app).post("/api/user/reset-password").send({
    token: "badtoken",
    password: "123",
    password2: "123",
  });

  expect(response.statusCode).toBe(400);
});
