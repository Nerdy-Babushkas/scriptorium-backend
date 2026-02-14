const bcrypt = require("bcrypt");
const crypto = require("node:crypto");

const User = require("../models/User");
const { sendPasswordResetEmail } = require("./email-service");

module.exports.requestPasswordReset = async function (email) {
  const user = await User.findOne({ email });

  // Prevent email enumeration
  if (!user) {
    return { message: "If an account exists, a reset email was sent" };
  }

  // 1. Generate a random token
  const resetToken = crypto.randomBytes(32).toString("hex");

  // 2. Hash the token before saving to DB for security
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // 3. Save hashed token and expiry to user
  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await user.save();

  // 4. Send the plain token via email
  await sendPasswordResetEmail({
    to: user.email,
    token: resetToken,
  });

  return { message: "If an account exists, a reset email was sent" };
};

module.exports.resetPassword = async function (
  token,
  newPassword,
  confirmPassword,
) {
  W;

  if (!newPassword || !confirmPassword) {
    throw new Error("Please fill both password fields");
  }

  if (newPassword !== confirmPassword) {
    throw new Error("Passwords do not match");
  }

  // Hash the incoming token to match the stored hash
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: new Date() },
  });

  if (!user) {
    throw new Error("Invalid or expired reset token");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  user.password = hashedPassword;
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;

  await user.save();

  return { message: "Password successfully reset" };
};
