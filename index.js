//server.js

const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const passportJWT = require("passport-jwt");
const dotenv = require("dotenv");

dotenv.config();
const emailService = require("./services/email-service");
const userService = require("./services/user-service.js");
const passwordResetService = require("./services/password-reset-service");

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

app.post("/api/user/register", async (req, res) => {
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

app.post("/api/user/forgot-password", async (req, res) => {
  try {
    const result = await passwordResetService.requestPasswordReset(
      req.body.email,
    );
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.post("/api/user/reset-password", async (req, res) => {
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
