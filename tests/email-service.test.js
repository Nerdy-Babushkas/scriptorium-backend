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
    process.env.FRONTEND_URL = "http://localhost:3000";
  });

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
});
