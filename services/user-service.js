const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
require("../models/Bookshelf");
require("../models/MusicShelf");

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
    verificationTokenExpires: new Date(Date.now() + 60 * 60 * 3000),
    showTips: true,
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

//
// DECODE USER FROM TOKEN
//
module.exports.getUserFromToken = function (req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) throw new Error("Missing Authorization header");

  const parts = authHeader.split(" ");
  const token = parts.length === 2 ? parts[1] : authHeader;

  try {
    const decodedUser = jwt.verify(token, process.env.JWT_SECRET);
    return decodedUser;
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new Error("Your session has expired. Please log in again.");
    }
    throw new Error("Invalid session. Please log in again.");
  }
};

// UPDATE USER PROFILE (username, ai_info, etc)
module.exports.updateUserProfile = async function (userId, updateData) {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  // ================= USERNAME =================
  if (updateData.userName !== undefined) {
    const name = updateData.userName.trim();

    user.userName = name;
  }

  // ================= AI PERMISSION =================
  if (typeof updateData.ai_info === "boolean") {
    user.ai_info = updateData.ai_info;
  }

  await user.save();

  return {
    userName: user.userName,
    email: user.email,
    ai_info: user.ai_info,
  };
};

// UPDATE PASSWORD
module.exports.updatePassword = async function (
  userId,
  oldPassword,
  newPassword,
) {
  if (!oldPassword || !newPassword) {
    throw new Error("Old and new password are required");
  }

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  // ================= VERIFY OLD PASSWORD =================
  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) throw new Error("Old password is incorrect");

  // ================= PASSWORD VALIDATION =================

  // Length
  if (newPassword.length < 8) {
    throw new Error("Password must be at least 8 characters long.");
  }

  // Uppercase
  if (!/[A-Z]/.test(newPassword)) {
    throw new Error("Password must contain at least one uppercase letter.");
  }

  // Lowercase
  if (!/[a-z]/.test(newPassword)) {
    throw new Error("Password must contain at least one lowercase letter.");
  }

  // Number
  if (!/\d/.test(newPassword)) {
    throw new Error("Password must contain at least one number.");
  }

  // Special character
  if (!/[!_@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
    throw new Error(
      "Password must include at least one special character (!@#$...).",
    );
  }

  // Optional: prevent reusing same password
  const samePassword = await bcrypt.compare(newPassword, user.password);
  if (samePassword) {
    throw new Error("New password must be different from old password.");
  }

  // ================= SAVE =================
  const hash = await bcrypt.hash(newPassword, 10);
  user.password = hash;

  await user.save();

  return { message: "Password updated successfully" };
};

// GET USER PROFILE
module.exports.getUserProfile = async function (userId) {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  return {
    userName: user.userName,
    ai_info: user.ai_info,
  };
};

// ============================
// ✅ NEW: GET USER BY ID
// ============================
module.exports.getUserById = async function (userId) {
  return await User.findById(userId);
};

// ============================
// ✅ NEW: UPDATE USER (FOR showTips)
// ============================
module.exports.updateUser = async function (
  userId,
  updateData
) {
  return await User.findByIdAndUpdate(userId, updateData, {
    new: true,
  });
};