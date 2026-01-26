// user-service.js
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { OAuth2Client } = require("google-auth-library");
const crypto = require("crypto");

const mongoDBConnectionString = process.env.MONGO_URL;
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    userName: String,
    password: { type: String, default: null },
    email: { type: String, unique: true },
    googleId: { type: String, default: null, index: true },
    authProvider: { type: String, enum: ["local", "google"], default: "local" },

    // Email verification
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String, default: null },
    verificationTokenExpires: { type: Date, default: null },

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

/* -------------------- CONNECTION -------------------- */
module.exports.connect = function () {
  return new Promise((resolve, reject) => {
    const db = mongoose.createConnection(mongoDBConnectionString);

    db.on("error", reject);
    db.once("open", () => {
      console.log("connected to DB");
      User = db.model("users", userSchema);
      resolve();
    });
  });
};

/* -------------------- REGISTER -------------------- */
module.exports.registerUser = function (userData) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!userData.password || !userData.password2) {
        return reject({
          code: "PASSWORD_REQUIRED",
          message: "Password and confirmation are required",
        });
      }

      if (userData.password !== userData.password2) {
        return reject({
          code: "PASSWORD_MISMATCH",
          message: "Passwords do not match",
        });
      }

      const hash = await bcrypt.hash(userData.password, 10);
      const userName = userData.email.split("@")[0].split("+")[0];

      const verificationToken = crypto.randomBytes(32).toString("hex");
      const verificationTokenExpires = new Date(Date.now() + 60 * 60 * 1000);

      const newUser = new User({
        userName,
        email: userData.email,
        password: hash,
        authProvider: "local",
        isVerified: false,
        verificationToken,
        verificationTokenExpires,
      });

      await newUser.save();

      resolve({
        message: "User registered! Please verify your email.",
        verificationToken,
        userEmail: newUser.email,
      });
    } catch (err) {
      if (err.code === 11000) {
        reject({
          code: "EMAIL_EXISTS",
          message: "Email already registered",
        });
      } else {
        reject({
          code: "REGISTER_ERROR",
          message: err.message,
        });
      }
    }
  });
};

/* -------------------- VERIFY EMAIL -------------------- */
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

/* -------------------- LOGIN -------------------- */
module.exports.checkUser = function (userData) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log("🔍 Login attempt:", userData.email);

      const user = await User.findOne({ email: userData.email });
      if (!user) {
        console.log("❌ User not found");
        return reject({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      console.log("✅ User found:", {
        email: user.email,
        isVerified: user.isVerified,
        authProvider: user.authProvider,
      });

      if (user.authProvider !== "local") {
        return reject({
          code: "WRONG_PROVIDER",
          message: `Use ${user.authProvider} login`,
          provider: user.authProvider,
        });
      }

      if (!user.isVerified) {
        console.log("📧 User not verified");
        return reject({
          code: "NOT_VERIFIED",
          message: "Email not verified. We’ve re-sent the verification email.",
          userId: user._id,
          email: user.email,
        });
      }

      const isMatch = await bcrypt.compare(userData.password, user.password);
      console.log("🔑 Password match:", isMatch);

      if (!isMatch) {
        return reject({
          code: "BAD_PASSWORD",
          message: "Incorrect password",
        });
      }

      user.last_login = new Date();
      await user.save();

      console.log("🎉 Login success");
      resolve(user);
    } catch (err) {
      console.error("🔥 Login error:", err);
      reject({
        code: "UNKNOWN_ERROR",
        message: "Login failed",
      });
    }
  });
};

/* -------------------- VERIFICATION TOKEN UPDATE -------------------- */
module.exports.setVerificationToken = async function (userId, token) {
  await User.updateOne(
    { _id: userId },
    {
      verificationToken: token,
      verificationTokenExpires: new Date(Date.now() + 60 * 60 * 1000),
    },
  );

  console.log("🔑 Verification token updated for user:", userId);
};

/* -------------------- GOOGLE AUTH -------------------- */
module.exports.googleAuth = async function (idToken) {
  console.log("🌐 Google Auth started");

  try {
    if (!idToken) {
      console.log("❌ No idToken provided");
      throw new Error("idToken is required");
    }

    console.log("🔑 Verifying idToken with Google API...");
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    console.log("✅ Google payload received:", payload);

    const { sub: googleId, email } = payload;
    console.log("🔍 Searching for existing user with googleId or email...");

    let user = await User.findOne({
      $or: [{ googleId }, { email }],
    });

    if (!user) {
      console.log("🆕 No existing user found, creating a new one...");
      user = new User({
        userName: email.split("@")[0].split("+")[0],
        email,
        googleId,
        authProvider: "google",
        isVerified: true,
      });
      await user.save();
      console.log("✅ New Google user created:", user);
    } else if (!user.googleId) {
      console.log("⚠️ User exists but has no googleId, updating record...");
      user.googleId = googleId;
      user.authProvider = "google";
      user.isVerified = true;
      await user.save();
      console.log("✅ Existing user updated for Google login:", user);
    } else {
      console.log("🔁 Existing Google user found:", user);
    }

    user.last_login = new Date();
    await user.save();
    console.log("🕒 Last login updated:", user.last_login);

    return user;
  } catch (err) {
    console.error("💥 Google authentication failed:", err);
    throw new Error("Google authentication failed: " + err.message);
  }
};

/* -------------------- PASSWORD RESET REQUEST -------------------- */
module.exports.requestPasswordReset = async function (email) {
  console.log("🔔 Password reset requested for:", email);

  const user = await User.findOne({ email });

  if (!user) {
    console.log("❌ User not found:", email);
    throw new Error("User not found");
  }

  if (user.authProvider !== "local") {
    console.log("❌ Cannot reset password for non-local user:", email);
    throw new Error("Cannot reset password for Google login");
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  user.verificationToken = resetToken; // reuse verificationToken field
  user.verificationTokenExpires = resetTokenExpires;
  await user.save();

  console.log(
    `✅ Reset token generated for user: ${email}, token expires at ${resetTokenExpires.toISOString()}`,
  );

  return { resetToken, email: user.email, userName: user.userName };
};

/* -------------------- RESET PASSWORD -------------------- */
/* -------------------- RESET PASSWORD -------------------- */
module.exports.resetPassword = async function (
  token,
  newPassword,
  confirmPassword,
) {
  console.log("🔑 Reset password attempt with token:", token);

  if (!newPassword || !confirmPassword) {
    console.log("❌ Password or confirmation missing");
    throw new Error("Password and confirmation are required");
  }

  if (newPassword !== confirmPassword) {
    console.log("❌ Passwords do not match");
    throw new Error("Passwords do not match");
  }

  const user = await User.findOne({
    verificationToken: token,
    verificationTokenExpires: { $gt: new Date() },
  });

  if (!user) {
    console.log("❌ Invalid or expired reset token");
    throw new Error("Invalid or expired reset token");
  }

  const hash = await bcrypt.hash(newPassword, 10);
  user.password = hash;
  user.verificationToken = null;
  user.verificationTokenExpires = null;
  await user.save();

  console.log(`✅ Password reset successful for user: ${user.email}`);

  return user;
};
