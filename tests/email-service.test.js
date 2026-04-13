const nodemailer = require("nodemailer");
const emailService = require("../services/email-service");

jest.mock("nodemailer");

describe("Email Service", () => {
  let sendMailMock;

  beforeEach(() => {
    sendMailMock = jest.fn().mockResolvedValue(true);
    nodemailer.createTransport.mockReturnValue({ sendMail: sendMailMock });
    jest.clearAllMocks();
    process.env.SMTP_USER = "test@example.com";
    process.env.SMTP_PORT = "465";
    process.env.FRONTEND_URL = "http://localhost:3000";
  });

  // --- sendVerificationEmail ---
  test("sendVerificationEmail calls transporter with correct params", async () => {
    const token = "abc123";
    const to = "user@example.com";
    await emailService.sendVerificationEmail({ to, token });
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to,
        subject: "Verify your email",
        html: expect.stringContaining(token),
      }),
    );
  });

  // --- sendPasswordResetEmail ---
  test("sendPasswordResetEmail calls transporter with correct params", async () => {
    const token = "reset123";
    const to = "user@example.com";
    await emailService.sendPasswordResetEmail({ to, token });
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to,
        subject: "Reset your password",
        html: expect.stringContaining(token),
      }),
    );
  });

  // --- sendFeedbackEmail with all fields ---
  test("sendFeedbackEmail sends email with all fields provided", async () => {
    await emailService.sendFeedbackEmail({
      name: "Jane Doe",
      email: "jane@example.com",
      area: "Library",
      description: "Love the 3D room!",
    });
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "babushkas.prj@gmail.com",
        subject: "[Feedback] Library — Jane Doe",
        replyTo: "jane@example.com",
        html: expect.stringContaining("Love the 3D room!"),
      }),
    );
  });

  // --- sendFeedbackEmail with no name (covers name || "Anonymous" branch) ---
  test("sendFeedbackEmail uses Anonymous when name is not provided", async () => {
    await emailService.sendFeedbackEmail({
      name: "",
      email: "jane@example.com",
      area: "Bug Report",
      description: "Something is broken",
    });
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "[Feedback] Bug Report — Anonymous",
        html: expect.stringContaining("Not provided"),
      }),
    );
  });

  // --- sendFeedbackEmail with no email (covers email || SMTP_USER branch) ---
  test("sendFeedbackEmail falls back to SMTP_USER when email is not provided", async () => {
    await emailService.sendFeedbackEmail({
      name: "John",
      email: "",
      area: "General",
      description: "Great app!",
    });
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        replyTo: "test@example.com",
        html: expect.stringContaining("Not provided"),
      }),
    );
  });

  // --- sendFeedbackEmail with neither name nor email ---
  test("sendFeedbackEmail handles missing name and email gracefully", async () => {
    await emailService.sendFeedbackEmail({
      name: "",
      email: "",
      area: "Feature Request",
      description: "Please add dark mode",
    });
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "[Feedback] Feature Request — Anonymous",
        replyTo: "test@example.com",
      }),
    );
  });

  // --- createTransporter uses secure: true when port is 465 ---
  test("createTransporter sets secure to true when port is 465", async () => {
    process.env.SMTP_PORT = "465";
    await emailService.sendVerificationEmail({ to: "a@b.com", token: "t" });
    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ secure: true, port: 465 }),
    );
  });

  // --- createTransporter uses secure: false when port is not 465 ---
  test("createTransporter sets secure to false when port is not 465", async () => {
    process.env.SMTP_PORT = "587";
    await emailService.sendVerificationEmail({ to: "a@b.com", token: "t" });
    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ secure: false, port: 587 }),
    );
  });
});