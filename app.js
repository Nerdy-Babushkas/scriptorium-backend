const express = require("express");
const cors = require("cors");
const passport = require("passport");
const passportJWT = require("passport-jwt");

const routes = require("./routes");

const app = express();

// ===== JWT / Passport Setup =====
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

// ===== Middleware =====
app.use(express.json());
app.use(cors());
app.use(passport.initialize());

// ===== Health Check =====
app.get("/", (req, res) => {
  res.status(200).json({ status: "Scriptorium's UsersAPI health check ok" });
});

// ===== Routes =====
app.use("/api", routes);

module.exports = app;
