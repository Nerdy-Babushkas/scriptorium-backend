// server.js

const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const passportJWT = require("passport-jwt");
const dotenv = require("dotenv");
const crypto = require("node:crypto");

dotenv.config();

const nodemailer = require("nodemailer"); // <--- for sending verification emails
const userService = require("./user-service.js");
const HTTP_PORT = process.env.PORT || 8080;

let ExtractJwt = passportJWT.ExtractJwt;
let JwtStrategy = passportJWT.Strategy;

let jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme("jwt"),
  secretOrKey: process.env.JWT_SECRET,
};

let strategy = new JwtStrategy(jwtOptions, function (jwt_payload, next) {
  if (jwt_payload) {
    next(null, {
      _id: jwt_payload._id,
      userName: jwt_payload.userName,
    });
  } else {
    next(null, false);
  }
});
passport.use(strategy);

app.use(express.json());
app.use(cors());
app.use(passport.initialize());

app.get("/", (req, res) => {
  res.status(200).json({ status: "Scriptorium's UsersAPI health check ok" });
});

// --- LOCAL REGISTRATION ---
app.post("/api/user/register", async (req, res) => {
  try {
    const { verificationToken, userEmail, message } =
      await userService.registerUser(req.body);

    // Send verification email
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    await transporter.sendMail({
      from: `"Scriptorium" <${process.env.SMTP_USER}>`,
      to: userEmail,
      subject: "Verify your email",
      html: `<p>Thank you for registering! Please verify your email by clicking the link below:</p>
             <a href="${verificationLink}">Verify Email</a>`,
    });

    res.json({ message: message });
  } catch (err) {
    res.status(422).json({ message: err.toString() });
  }
});

// --- VERIFY EMAIL ---
// --- VERIFY EMAIL ---
app.get("/api/user/verify", async (req, res) => {
  const token = req.query.token; // <-- read token from ?token=
  try {
    const user = await userService.verifyEmail(token);
    res.json({ message: "Email successfully verified!", user: user.userName });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// --- LOCAL LOGIN ---
app.post("/api/user/login", async (req, res) => {
  try {
    const user = await userService.checkUser(req.body);

    const payload = {
      _id: user._id,
      userName: user.userName,
      email: user.email,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET);
    return res.json({ message: "login successful", token });
  } catch (err) {
    console.log("⚠️ Login rejected:", err);

    // 🔁 EMAIL NOT VERIFIED → RESEND
    if (err.code === "NOT_VERIFIED") {
      const newToken = crypto.randomBytes(32).toString("hex");

      await userService.setVerificationToken(err.userId, newToken);

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${newToken}`;

      await transporter.sendMail({
        from: `"Scriptorium" <${process.env.SMTP_USER}>`,
        to: err.email,
        subject: "Verify your email",
        html: `
          <p>Your email is not verified.</p>
          <p>Please verify it here:</p>
          <a href="${verificationLink}">Verify Email</a>
        `,
      });

      return res.status(403).json({
        message: err.message,
      });
    }

    // ❌ WRONG PASSWORD
    if (err.code === "BAD_PASSWORD") {
      return res.status(401).json({ message: err.message });
    }

    // ❌ WRONG PROVIDER
    if (err.code === "WRONG_PROVIDER") {
      return res.status(400).json({ message: err.message });
    }

    // ❌ FALLBACK
    return res.status(422).json({
      message: err.message || "Login failed",
    });
  }
});

// --- GOOGLE LOGIN ---
app.post("/api/user/google", async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ message: "idToken is required" });
  }

  try {
    const user = await userService.googleAuth(idToken);

    const payload = {
      _id: user._id,
      userName: user.userName,
      email: user.email,
    };
    const token = jwt.sign(payload, jwtOptions.secretOrKey);

    res.json({ message: "Google login successful", token });
  } catch (err) {
    res.status(422).json({ message: err.message });
  }
});

userService
  .connect()
  .then(() => {
    app.listen(HTTP_PORT, () => {
      console.log("API listening on: " + HTTP_PORT);
    });
  })
  .catch((err) => {
    console.log("unable to start the server: " + err);
    process.exit();
  });

// --- REQUEST PASSWORD RESET ---
app.post("/api/user/forgot-password", async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const {
      resetToken,
      userName,
      email: userEmail,
    } = await userService.requestPasswordReset(email);

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    await transporter.sendMail({
      from: `"Scriptorium" <${process.env.SMTP_USER}>`,
      to: userEmail,
      subject: "Reset your password",
      html: `
        <p>Hello ${userName},</p>
        <p>You requested to reset your password. Click the link below to set a new password:</p>
        <a href="${resetLink}">Reset Password</a>
        <p>If you didn’t request this, ignore this email.</p>
      `,
    });

    res.json({ message: "Password reset email sent" });
  } catch (err) {
    res.status(422).json({ message: err.message });
  }
});

// --- RESET PASSWORD ---
app.post("/api/user/reset-password", async (req, res) => {
  const { token, password, password2 } = req.body;

  if (!token) return res.status(400).json({ message: "Token is required" });

  try {
    const user = await userService.resetPassword(token, password, password2);
    res.json({ message: "Password successfully reset", user: user.userName });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});
