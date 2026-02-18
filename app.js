// app.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const passport = require("passport");
const passportJWT = require("passport-jwt");
const connectDB = require("./config/db");

const routes = require("./routes");

const app = express();

connectDB();

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

app.use(express.json());

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (origin === "https://scriptorium-frontend.vercel.app") {
      return callback(null, true);
    }

    // allow any scriptorium-frontend vercel preview URL
    if (origin.includes("scriptorium-frontend") && origin.endsWith(".vercel.app")) {
      return callback(null, true);
    }

    if (origin.startsWith("http://localhost:")) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// hard-stop OPTIONS so it never hits auth/routes
app.use((req, res, next) => {
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(passport.initialize());

app.get("/", (req, res) => {
  res.status(200).json({ status: "UsersAPI OK" });
});

app.use("/api", routes);

module.exports = app;
