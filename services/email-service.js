const nodemailer = require("nodemailer");

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

module.exports.sendVerificationEmail = async function ({ to, token }) {
  const transporter = createTransporter();

  const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

  await transporter.sendMail({
    from: `"Scriptorium" <${process.env.SMTP_USER}>`,
    to,
    subject: "Verify your email",
    html: `
      <p>Thank you for registering!</p>
      <p>Please verify your email by clicking the link below:</p>
      <a href="${verificationLink}">Verify Email</a>
    `,
  });
};

module.exports.sendPasswordResetEmail = async function ({ to, token }) {
  const transporter = createTransporter();

  const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;

  await transporter.sendMail({
    from: `"Scriptorium" <${process.env.SMTP_USER}>`,
    to,
    subject: "Reset your password",
    html: `
      <p>You requested a password reset.</p>
      <p>This link will expire in 1 hour.</p>
      <a href="${resetLink}">Reset Password</a>
      <p>If you didn’t request this, you can ignore this email.</p>
    `,
  });
};


module.exports.sendFeedbackEmail = async function ({ name, email, area, description }) {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"Scriptorium Feedback" <${process.env.SMTP_USER}>`,
    to: "babushkas.prj@gmail.com",
    replyTo: email || process.env.SMTP_USER,
    subject: `[Feedback] ${area} — ${name || "Anonymous"}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f191e; color: #ffffff; padding: 32px; border-radius: 12px;">
        <h2 style="color: #00C49A; margin-bottom: 4px;">New Feedback Received</h2>
        <p style="color: #888; margin-top: 0;">via Scriptorium Feedback Form</p>
        <hr style="border-color: #333; margin: 24px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; color: #888; width: 140px; vertical-align: top;">Name</td>
            <td style="padding: 10px 0; color: #fff;">${name || "Not provided"}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #888; vertical-align: top;">Email</td>
            <td style="padding: 10px 0; color: #fff;">${email || "Not provided"}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #888; vertical-align: top;">Area</td>
            <td style="padding: 10px 0; color: #00C49A; font-weight: bold;">${area}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #888; vertical-align: top;">Feedback</td>
            <td style="padding: 10px 0; color: #fff; white-space: pre-wrap;">${description}</td>
          </tr>
        </table>
        <hr style="border-color: #333; margin: 24px 0;">
        <p style="color: #555; font-size: 12px;">Sent from scriptorium-frontend.vercel.app</p>
      </div>
    `,
  });
};
