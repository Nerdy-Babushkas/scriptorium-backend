const bcrypt = require("bcrypt");
const crypto = require("node:crypto");

const { getUserModel } = require("./user-service");

module.exports.requestPasswordReset = async function (email) {
  const User = getUserModel();

  const user = await User.findOne({ email });

  if (!user) {
    return { message: "If an account exists, a reset email was sent" };
  }

  const resetToken = crypto.randomBytes(32).toString("hex");

  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);

  await user.save();

  return {
    message: "Password reset token created",
    resetToken,
    email: user.email,
  };
};

module.exports.resetPassword = async function (
  token,
  newPassword,
  confirmPassword,
) {
  const User = getUserModel();

  if (!newPassword || !confirmPassword) {
    throw new Error("Please fill both password fields");
  }

  if (newPassword !== confirmPassword) {
    throw new Error("Passwords do not match");
  }

  const user = await User.findOne({
    resetPasswordToken: token,
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
