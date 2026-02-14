const bcrypt = require("bcrypt");
const crypto = require("crypto");
const User = require("../models/User");

//
// REGISTER
//
module.exports.registerUser = async function (userData) {
  if (!userData.password || !userData.password2) {
    throw new Error("Please fill both password fields");
  }

  if (userData.password !== userData.password2) {
    throw new Error("Passwords do not match");
  }

  const hash = await bcrypt.hash(userData.password, 10);

  let userName = userData.email.trim().split("@")[0];
  if (userName.includes("+")) userName = userName.split("+")[0];

  const verificationToken = crypto.randomBytes(32).toString("hex");

  const newUser = new User({
    userName,
    email: userData.email.trim(),
    password: hash,
    verificationToken,
    verificationTokenExpires: new Date(Date.now() + 60 * 60 * 1000),
  });

  try {
    await newUser.save();
  } catch (err) {
    if (err.code === 11000) throw new Error("Email already registered");
    throw err;
  }

  return {
    message: `User ${userName} successfully registered`,
    verificationToken,
    userEmail: newUser.email,
  };
};

//
// VERIFY EMAIL
//
module.exports.verifyEmail = async function (token) {
  const user = await User.findOne({
    verificationToken: token,
    verificationTokenExpires: { $gt: new Date() },
  });

  if (!user) throw new Error("Invalid or expired verification token");

  user.isVerified = true;
  user.verificationToken = null;
  user.verificationTokenExpires = null;

  await user.save();
  return user;
};

//
// LOGIN
//
module.exports.checkUser = async function (userData) {
  const user = await User.findOne({ email: userData.email });

  if (!user) throw new Error("User not found");
  if (!user.isVerified) throw new Error("Email not verified");

  const isMatch = await bcrypt.compare(userData.password, user.password);
  if (!isMatch) throw new Error("Incorrect password");

  user.last_login = new Date();
  await user.save();

  return user;
};
