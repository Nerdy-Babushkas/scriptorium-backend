// tests/user-service.test.js

const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const userService = require("../services/user-service");

jest.mock("../models/User");
jest.mock("bcrypt");
jest.mock("crypto");
jest.mock("jsonwebtoken");

describe("User Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========================= REGISTER =========================
  describe("registerUser", () => {
    test("should throw error if passwords missing", async () => {
      await expect(userService.registerUser({})).rejects.toThrow(
        "Please fill both password fields",
      );
    });

    test("should throw error if passwords do not match", async () => {
      await expect(
        userService.registerUser({ password: "123", password2: "321" }),
      ).rejects.toThrow("Passwords do not match");
    });

    test("should create a user successfully", async () => {
      bcrypt.hash.mockResolvedValue("hashedpwd");
      crypto.randomBytes.mockReturnValue({ toString: () => "token123" });
      const mockSave = jest.fn().mockResolvedValue(true);
      User.mockImplementation(() => ({ save: mockSave }));

      const userData = {
        email: "test@example.com",
        password: "123456",
        password2: "123456",
      };

      const result = await userService.registerUser(userData);

      expect(result.message).toContain("User test successfully registered");
      expect(result.verificationToken).toBe("token123");
      expect(mockSave).toHaveBeenCalled();
    });

    test("should throw error if email already registered", async () => {
      bcrypt.hash.mockResolvedValue("hashedpwd");
      crypto.randomBytes.mockReturnValue({ toString: () => "token123" });
      User.mockImplementation(() => {
        return {
          save: jest.fn().mockRejectedValue({ code: 11000 }),
        };
      });

      const userData = {
        email: "duplicate@example.com",
        password: "123456",
        password2: "123456",
      };

      await expect(userService.registerUser(userData)).rejects.toThrow(
        "Email already registered",
      );
    });
  });

  // ========================= VERIFY EMAIL =========================
  describe("verifyEmail", () => {
    test("should throw if token invalid", async () => {
      User.findOne.mockResolvedValue(null);

      await expect(userService.verifyEmail("badtoken")).rejects.toThrow(
        "Invalid or expired verification token",
      );
    });

    test("should verify user successfully", async () => {
      const mockSave = jest.fn().mockResolvedValue(true);
      const user = {
        isVerified: false,
        verificationToken: "t",
        verificationTokenExpires: new Date(),
        save: mockSave,
      };
      User.findOne.mockResolvedValue(user);

      const result = await userService.verifyEmail("goodtoken");

      expect(result.isVerified).toBe(true);
      expect(result.verificationToken).toBeNull();
      expect(mockSave).toHaveBeenCalled();
    });
  });

  // ========================= LOGIN =========================
  describe("checkUser", () => {
    test("should throw if user not found", async () => {
      User.findOne.mockResolvedValue(null);

      await expect(
        userService.checkUser({ email: "noone@test.com", password: "pwd" }),
      ).rejects.toThrow("User not found");
    });

    test("should throw if email not verified", async () => {
      User.findOne.mockResolvedValue({ isVerified: false });

      await expect(
        userService.checkUser({ email: "test@test.com", password: "pwd" }),
      ).rejects.toThrow("Email not verified");
    });

    test("should throw if password incorrect", async () => {
      const user = { isVerified: true, password: "hashedpwd" };
      User.findOne.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(false);

      await expect(
        userService.checkUser({ email: "test@test.com", password: "wrong" }),
      ).rejects.toThrow("Incorrect password");
    });

    test("should login successfully", async () => {
      const mockSave = jest.fn().mockResolvedValue(true);
      const user = {
        isVerified: true,
        password: "hashedpwd",
        last_login: null,
        save: mockSave,
      };
      User.findOne.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(true);

      const result = await userService.checkUser({
        email: "test@test.com",
        password: "pwd",
      });

      expect(result).toBe(user);
      expect(mockSave).toHaveBeenCalled();
      expect(result.last_login).not.toBeNull();
    });
  });

  // ========================= DECODE TOKEN =========================
  describe("getUserFromToken", () => {
    test("should throw if header missing", () => {
      expect(() => userService.getUserFromToken({ headers: {} })).toThrow(
        "Missing Authorization header",
      );
    });

    test("should decode token successfully", () => {
      jwt.verify.mockReturnValue({
        _id: "u1",
        userName: "test",
        email: "t@test.com",
      });

      const req = { headers: { authorization: "jwt mytoken" } };
      const result = userService.getUserFromToken(req);

      expect(result._id).toBe("u1");
      expect(result.userName).toBe("test");
    });
  });
});
