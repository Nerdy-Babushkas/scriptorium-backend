//server.js

const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const passportJWT = require("passport-jwt");
const dotenv = require("dotenv");
const crypto = require("node:crypto");

dotenv.config();
const nodemailer = require("nodemailer");
const userService = require("./user-service.js");

const HTTP_PORT = process.env.PORT || 8080;

let ExtractJwt = passportJWT.ExtractJwt;
let JwtStrategy = passportJWT.Strategy;

let jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme("jwt"),
  secretOrKey: process.env.JWT_SECRET,
};

let strategy = new JwtStrategy(jwtOptions, function (jwt_payload, next) {
  console.log("payload received", jwt_payload);

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

app.get("/api/user/verify", async (req, res) => {
  const token = req.query.token;
  try {
    const user = await userService.verifyEmail(token);
    res.json({ message: "Email successfully verified!", user: user.userName });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.post("/api/user/login", async (req, res) => {
  try {
    const user = await userService.checkUser(req.body);

    const payload = {
      _id: user._id,
      userName: user.userName,
      email: user.email,
    };

    const token = jwt.sign(payload, jwtOptions.secretOrKey, {
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
