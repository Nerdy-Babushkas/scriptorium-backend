//user-service
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const crypto = require("node:crypto");

let mongoDBConnectionString = process.env.MONGO_URL;

let Schema = mongoose.Schema;

let userSchema = new Schema(
  {
    userName: String,
    password: String,
    email: { type: String, unique: true },

    // Email verification
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String, default: null },
    verificationTokenExpires: { type: Date, default: null },

    // Password reset
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },

    points_balance: { type: Number, default: 0 },
    reflections: { type: [Object], default: [] },
    goals: { type: [Object], default: [] },
    achievements: { type: [Object], default: [] },
    owned_rewards: { type: [Object], default: [] },
    rooms: { type: [Object], default: [] },
    media_placements: { type: [Object], default: [] },
    last_login: { type: Date, default: null },
  },
  { timestamps: true },
);

let User;

module.exports.connect = function () {
  return new Promise(function (resolve, reject) {
    let db = mongoose.createConnection(mongoDBConnectionString);

    db.on("error", (err) => {
      reject(err);
    });

    db.once("open", () => {
      console.log("connected to DB");
      User = db.model("users", userSchema);
      resolve();
    });
  });
};

module.exports.registerUser = function (userData) {
  return new Promise(function (resolve, reject) {
    if (userData.password != userData.password2) {
      reject("Passwords do not match");
    } else if (!userData.password || !userData.password2) {
      reject("Please fill both password and password confirmation fields");
    } else {
      bcrypt
        .hash(userData.password, 10)
        .then((hash) => {
          userData.password = hash;
          userName = userData.email.split("@")[0];
          if (userName.includes("+")) {
            userName = userName.split("+")[0];
          }

          const verificationToken = crypto.randomBytes(32).toString("hex");
          const verificationTokenExpires = new Date(
            Date.now() + 60 * 60 * 1000,
          );

          let newUser = new User({
            userName: userName,
            email: userData.email,
            password: hash,
            isVerified: false,
            verificationToken: verificationToken,
            verificationTokenExpires: verificationTokenExpires,
          });

          newUser
            .save()
            .then(() => {
              resolve({
                message: "User " + userName + " successfully registered",
                verificationToken: verificationToken,
                userEmail: userData.email,
              });
            })
            .catch((err) => {
              if (err.code == 11000) {
                reject("email already registered");
              } else {
                reject("There was an error creating the user: " + err);
              }
            });
        })
        .catch((err) => reject(err));
    }
  });
};

module.exports.verifyEmail = async function (token) {
  const user = await User.findOne({
    verificationToken: token,
    verificationTokenExpires: { $gt: new Date() },
  });

  if (!user) {
    throw new Error("Invalid or expired verification token");
  }

  user.isVerified = true;
  user.verificationToken = null;
  user.verificationTokenExpires = null;
  await user.save();

  return user;
};

module.exports.checkUser = function (userData) {
  return new Promise(function (resolve, reject) {
    User.findOne({ email: userData.email })
      .then((user) => {
        if (!user) {
          return reject("Unable to find user with email " + userData.email);
        }

        if (!user.isVerified) {
          return reject(new Error("Email not verified"));
        }

        return bcrypt
          .compare(userData.password, user.password)
          .then((isMatch) => {
            if (!isMatch) {
              return reject("Incorrect password for email " + userData.email);
            }

            user.last_login = new Date();
            return user.save().then(() => resolve(user));
          });
      })
      .catch(() => {
        reject("Unable to find user with email " + userData.email);
      });
  });
};

module.exports.setVerificationToken = async function (userId, token) {
  await User.updateOne(
    { _id: userId },
    {
      verificationToken: token,
      verificationTokenExpires: new Date(Date.now() + 60 * 60 * 1000),
    },
  );
};

module.exports.getUserModel = function () {
  if (!User) {
    throw new Error("DB not connected yet");
  }
  return User;
};
