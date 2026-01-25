//user-service
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

let mongoDBConnectionString = process.env.MONGO_URL;

let Schema = mongoose.Schema;

let userSchema = new Schema(
  {
    userName: String,
    password: String,
    email: { type: String, unique: true },
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
          if (username.includes("+")) {
            userName = userName.split("+")[0];
          }
          let newUser = new User({
            userName: userName,
            email: userData.email,
            password: userData.password,
          });

          newUser
            .save()
            .then(() => {
              resolve("User " + userName + " successfully registered");
            })
            .catch((err) => {
              if (err.code == 11000) {
                reject("User Name already taken");
              } else {
                reject("There was an error creating the user: " + err);
              }
            });
        })
        .catch((err) => reject(err));
    }
  });
};

module.exports.checkUser = function (userData) {
  return new Promise(function (resolve, reject) {
    // Find the user by email instead of username
    User.findOne({ email: userData.email })
      .then((user) => {
        if (!user) {
          return reject("Unable to find user with email " + userData.email);
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
