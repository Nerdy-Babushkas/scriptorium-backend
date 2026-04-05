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
jest.mock("../services/badge-service", () => ({
  onUserJoined: jest.fn().mockResolvedValue([]),
}));

const badgeService = require("../services/badge-service");

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
      User.mockImplementation(() => ({ _id: "u1", save: mockSave }));

      const userData = {
        email: "test@example.com",
        password: "123456",
        password2: "123456",
      };

      const result = await userService.registerUser(userData);

      expect(result.message).toContain("User test successfully registered");
      expect(result.verificationToken).toBe("token123");
      expect(mockSave).toHaveBeenCalled();
      expect(badgeService.onUserJoined).toHaveBeenCalledWith("u1");
    });

    test("should still succeed if badge service throws", async () => {
      bcrypt.hash.mockResolvedValue("hashedpwd");
      crypto.randomBytes.mockReturnValue({ toString: () => "token123" });
      const mockSave = jest.fn().mockResolvedValue(true);
      User.mockImplementation(() => ({ _id: "u1", save: mockSave }));
      badgeService.onUserJoined.mockRejectedValueOnce(new Error("DB down"));

      const userData = {
        email: "test@example.com",
        password: "123456",
        password2: "123456",
      };

      // Should not throw — badge failure is non-fatal
      const result = await userService.registerUser(userData);
      expect(result.message).toContain("successfully registered");
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
  // ========================= UPDATE USER PROFILE =========================
  describe("updateUserProfile", () => {
    test("should throw if user not found", async () => {
      User.findById.mockResolvedValue(null);

      await expect(userService.updateUserProfile("u1", {})).rejects.toThrow(
        "User not found",
      );
    });

    test("should update username successfully", async () => {
      const mockSave = jest.fn().mockResolvedValue(true);

      const user = {
        userName: "oldName",
        email: "test@test.com",
        ai_info: false,
        save: mockSave,
      };

      User.findById.mockResolvedValue(user);

      const result = await userService.updateUserProfile("u1", {
        userName: "newName",
      });

      expect(user.userName).toBe("newName");
      expect(mockSave).toHaveBeenCalled();
      expect(result.userName).toBe("newName");
    });

    test("should trim username", async () => {
      const mockSave = jest.fn().mockResolvedValue(true);

      const user = {
        userName: "old",
        email: "test@test.com",
        ai_info: false,
        save: mockSave,
      };

      User.findById.mockResolvedValue(user);

      await userService.updateUserProfile("u1", {
        userName: "   trimmed   ",
      });

      expect(user.userName).toBe("trimmed");
    });

    test("should update ai_info successfully", async () => {
      const mockSave = jest.fn().mockResolvedValue(true);

      const user = {
        userName: "test",
        email: "test@test.com",
        ai_info: false,
        save: mockSave,
      };

      User.findById.mockResolvedValue(user);

      const result = await userService.updateUserProfile("u1", {
        ai_info: true,
      });

      expect(user.ai_info).toBe(true);
      expect(result.ai_info).toBe(true);
    });

    test("should update both username and ai_info", async () => {
      const mockSave = jest.fn().mockResolvedValue(true);

      const user = {
        userName: "old",
        email: "test@test.com",
        ai_info: false,
        save: mockSave,
      };

      User.findById.mockResolvedValue(user);

      const result = await userService.updateUserProfile("u1", {
        userName: "newUser",
        ai_info: true,
      });

      expect(user.userName).toBe("newUser");
      expect(user.ai_info).toBe(true);
      expect(result.userName).toBe("newUser");
      expect(result.ai_info).toBe(true);
    });

    test("should not update fields if not provided", async () => {
      const mockSave = jest.fn().mockResolvedValue(true);

      const user = {
        userName: "unchanged",
        email: "test@test.com",
        ai_info: false,
        save: mockSave,
      };

      User.findById.mockResolvedValue(user);

      const result = await userService.updateUserProfile("u1", {});

      expect(user.userName).toBe("unchanged");
      expect(user.ai_info).toBe(false);
      expect(result.userName).toBe("unchanged");
    });
  });

  // ========================= UPDATE PASSWORD =========================
  describe("updatePassword", () => {
    test("should throw if missing passwords", async () => {
      await expect(
        userService.updatePassword("u1", null, null),
      ).rejects.toThrow("Old and new password are required");
    });

    test("should throw if user not found", async () => {
      User.findById.mockResolvedValue(null);

      await expect(
        userService.updatePassword("u1", "oldPass", "Newpass1!"),
      ).rejects.toThrow("User not found");
    });

    test("should throw if old password incorrect", async () => {
      const user = { password: "hashed" };

      User.findById.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(false);

      await expect(
        userService.updatePassword("u1", "wrong", "Newpass1!"),
      ).rejects.toThrow("Old password is incorrect");
    });

    test("should throw if password too short", async () => {
      const user = { password: "hashed" };

      User.findById.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(true);

      await expect(
        userService.updatePassword("u1", "oldPass", "Short1!"),
      ).rejects.toThrow("Password must be at least 8 characters long.");
    });

    test("should throw if missing uppercase", async () => {
      const user = { password: "hashed" };

      User.findById.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(true);

      await expect(
        userService.updatePassword("u1", "oldPass", "lowercase1!"),
      ).rejects.toThrow("Password must contain at least one uppercase letter.");
    });

    test("should throw if missing lowercase", async () => {
      const user = { password: "hashed" };

      User.findById.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(true);

      await expect(
        userService.updatePassword("u1", "oldPass", "UPPERCASE1!"),
      ).rejects.toThrow("Password must contain at least one lowercase letter.");
    });

    test("should throw if missing number", async () => {
      const user = { password: "hashed" };

      User.findById.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(true);

      await expect(
        userService.updatePassword("u1", "oldPass", "NoNumber!"),
      ).rejects.toThrow("Password must contain at least one number.");
    });

    test("should throw if missing special character", async () => {
      const user = { password: "hashed" };

      User.findById.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(true);

      await expect(
        userService.updatePassword("u1", "oldPass", "NoSpecial1"),
      ).rejects.toThrow(
        "Password must include at least one special character (!@#$...).",
      );
    });

    test("should throw if new password same as old", async () => {
      const user = { password: "hashed" };

      User.findById.mockResolvedValue(user);

      // First compare = old password check → true
      // Second compare = same password check → true
      bcrypt.compare.mockResolvedValueOnce(true).mockResolvedValueOnce(true);

      await expect(
        userService.updatePassword("u1", "oldPass", "Oldpass1!"),
      ).rejects.toThrow("New password must be different from old password.");
    });

    test("should update password successfully", async () => {
      const mockSave = jest.fn().mockResolvedValue(true);

      const user = {
        password: "hashed",
        save: mockSave,
      };

      User.findById.mockResolvedValue(user);

      bcrypt.compare
        .mockResolvedValueOnce(true) // old password match
        .mockResolvedValueOnce(false); // new != old

      bcrypt.hash.mockResolvedValue("newHashed");

      const result = await userService.updatePassword(
        "u1",
        "oldPass",
        "ValidPass1!",
      );

      expect(user.password).toBe("newHashed");
      expect(mockSave).toHaveBeenCalled();
      expect(result.message).toBe("Password updated successfully");
    });
  });
});
