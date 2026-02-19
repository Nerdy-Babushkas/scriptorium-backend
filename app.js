// app.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const passport = require("passport");
const passportJWT = require("passport-jwt");
const connectDB = require("./config/db");

const routes = require("./routes");

const app = express();

//
// ===== CONNECT DB ON APP LOAD =====
//
connectDB();

//
// ===== JWT / Passport Setup =====
//
const ExtractJwt = passportJWT.ExtractJwt;
const JwtStrategy = passportJWT.Strategy;

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme("jwt"),
  secretOrKey: process.env.JWT_SECRET,
};

passport.use(
  new JwtStrategy(jwtOptions, (jwt_payload, done) => {
    if (jwt_payload) {
      return done(null, {
        _id: jwt_payload._id,
        userName: jwt_payload.userName,
      });
    }
    return done(null, false);
  }),
);

//
// ===== Middleware =====
//
app.use(express.json());
app.use(cors());
app.use(passport.initialize());

//
// ===== Health Check =====
//
app.get("/", (req, res) => {
  res.status(200).json({ status: "UsersAPI OK" });
});

//
// ===== Routes =====
//
app.use("/api", routes);

module.exports = app;