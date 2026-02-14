// routes/user.js
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const emailService = require("../services/email-service");
const userService = require("../services/user-service");
const passwordResetService = require("../services/password-reset-service");

// ================= REGISTER =================
router.post("/register", async (req, res) => {
  try {
    const { verificationToken, userEmail, message } =
      await userService.registerUser(req.body);

    await emailService.sendVerificationEmail({
      to: userEmail,
      token: verificationToken,
    });

    res.json({ message });
  } catch (err) {
    res.status(422).json({ message: err.message || err });
  }
});

// ================= VERIFY EMAIL =================
router.get("/verify", async (req, res) => {
  const token = req.query.token;
  try {
    const user = await userService.verifyEmail(token);
    res.json({ message: "Email successfully verified!", user: user.userName });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ================= LOGIN =================
router.post("/login", async (req, res) => {
  try {
    const user = await userService.checkUser(req.body);

    const payload = {
      _id: user._id,
      userName: user.userName,
      email: user.email,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({
      message: "login successful",
      token: token,
    });
  } catch (err) {
    res.status(422).json({
      message: err.message || "Login failed",
    });
  }
});

// ================= FORGOT PASSWORD =================
router.post("/forgot-password", async (req, res) => {
  try {
    const result = await passwordResetService.requestPasswordReset(
      req.body.email,
    );
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ================= RESET PASSWORD =================
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password, password2 } = req.body;

    const result = await passwordResetService.resetPassword(
      token,
      password,
      password2,
    );

    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
