import express from "express";
import jwt from "jsonwebtoken";
import { authenticate } from "../middleware/jwt.middleware.js";

const router = express.Router();

// Mock user for Sprint 1 (no database yet)
const MOCK_USER = {
  email: "test@scriptorium.com",
  password: "123456"
};

/**
 * POST /api/auth/login
 * Checks if user exists and returns a JWT token
 */
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  // Validate user (mock logic for Sprint 1)
  if (email === MOCK_USER.email && password === MOCK_USER.password) {
    const token = jwt.sign(
      { email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.status(200).json({ token });
  }

  return res.status(401).json({ error: "Invalid credentials" });
});

/**
 * GET /api/auth/protected
 * Example protected route
 */
router.get("/protected", authenticate, (req, res) => {
  res.status(200).json({ message: "Access granted" });
});

export default router;
