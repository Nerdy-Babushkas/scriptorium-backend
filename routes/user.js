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




// ================= GET TIPS =================
router.get("/tips", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("jwt ")) {
      return res.status(401).json({ message: "Invalid auth format" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await userService.getUserById(decoded._id || decoded.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ showTips: user.showTips });
  } catch (err) {
    console.error("GET /tips error:", err);
    res.status(401).json({ message: "Invalid token" });
  }
});


// ================= UPDATE TIPS =================
router.patch("/tips", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("jwt ")) {
      return res.status(401).json({ message: "Invalid auth format" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { showTips } = req.body;

    const updatedUser = await userService.updateUser(
      decoded._id || decoded.id,
      { showTips }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "showTips updated successfully",
      showTips: updatedUser.showTips,
    });
  } catch (err) {
    console.error("PATCH /tips error:", err);
    res.status(401).json({ message: "Invalid token" });
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

// ================= GET PROFILE DATA =================
router.get("/account", async (req, res) => {
  try {
    const user = userService.getUserFromToken(req);
    const profile = await userService.getUserProfile(user._id);
    res.json(profile);
  } catch (err) {
    // 401 Unauthorized because the token check likely failed
    res.status(401).json({ message: err.message });
  }
});

router.patch("/account", async (req, res) => {
  try {
    const user = userService.getUserFromToken(req);

    const updatedUser = await userService.updateUserProfile(user._id, req.body);

    res.json(updatedUser);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.patch("/account/password", async (req, res) => {
  try {
    const user = userService.getUserFromToken(req);

    const result = await userService.updatePassword(
      user._id,
      req.body.oldPassword,
      req.body.newPassword,
    );

    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
