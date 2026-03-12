// tests/password-service.test.js

const bcrypt = require("bcrypt");
const crypto = require("node:crypto");

const User = require("../models/User");
const { sendPasswordResetEmail } = require("../services/email-service");
const passwordService = require("../services/password-reset-service");

jest.mock("../models/User");
jest.mock("bcrypt");
jest.mock("node:crypto");
jest.mock("../services/email-service");

describe("Password Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ================= REQUEST PASSWORD RESET =================
  describe("requestPasswordReset", () => {
    test("returns message even if user not found (prevents enumeration)", async () => {
      User.findOne.mockResolvedValue(null);

      const result =
        await passwordService.requestPasswordReset("noone@test.com");
      expect(result.message).toBe(
        "If an account exists, a reset email was sent",
      );
    });

    test("generates token, saves hashed token, sends email", async () => {
      const mockSave = jest.fn().mockResolvedValue(true);
      const user = { email: "test@test.com", save: mockSave };
      User.findOne.mockResolvedValue(user);

      // Mock randomBytes
      crypto.randomBytes.mockReturnValue({ toString: () => "resettoken123" });
      // Mock createHash
      const mockDigest = jest.fn().mockReturnValue("hashedtoken123");
      crypto.createHash.mockReturnValue({
        update: () => ({ digest: mockDigest }),
      });

      sendPasswordResetEmail.mockResolvedValue(true);

      const result =
        await passwordService.requestPasswordReset("test@test.com");

      expect(result.message).toBe(
        "If an account exists, a reset email was sent",
      );
      expect(user.resetPasswordToken).toBe("hashedtoken123");
      expect(user.resetPasswordExpires).toBeInstanceOf(Date);
      expect(mockSave).toHaveBeenCalled();
      expect(sendPasswordResetEmail).toHaveBeenCalledWith({
        to: user.email,
        token: "resettoken123",
      });
    });
  });

  // ================= RESET PASSWORD =================
  describe("resetPassword", () => {
    test("throws if passwords missing", async () => {
      await expect(
        passwordService.resetPassword("token", null, null),
      ).rejects.toThrow("Please fill both password fields");
    });

    test("throws if passwords do not match", async () => {
      await expect(
        passwordService.resetPassword("token", "123", "321"),
      ).rejects.toThrow("Passwords do not match");
    });

    test("throws if token missing", async () => {
      await expect(
        passwordService.resetPassword(null, "123", "123"),
      ).rejects.toThrow("Invalid or expired reset token");
    });

    test("throws if no user found for token", async () => {
      crypto.createHash.mockReturnValue({
        update: () => ({ digest: () => "hashedtoken" }),
      });
      User.findOne.mockResolvedValue(null);

      await expect(
        passwordService.resetPassword("token", "123", "123"),
      ).rejects.toThrow("Invalid or expired reset token");
    });

    test("resets password successfully", async () => {
      const mockSave = jest.fn().mockResolvedValue(true);
      const user = { save: mockSave };
      User.findOne.mockResolvedValue(user);

      crypto.createHash.mockReturnValue({
        update: () => ({ digest: () => "hashedtoken" }),
      });
      bcrypt.hash.mockResolvedValue("newhashedpwd");

      const result = await passwordService.resetPassword(
        "token",
        "123456",
        "123456",
      );

      expect(user.password).toBe("newhashedpwd");
      expect(user.resetPasswordToken).toBeNull();
      expect(user.resetPasswordExpires).toBeNull();
      expect(mockSave).toHaveBeenCalled();
      expect(result.message).toBe("Password successfully reset");
    });
  });
});
