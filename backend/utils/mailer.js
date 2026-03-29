const nodemailer = require("nodemailer");

const getRequiredMailConfig = () => {
  const config = {
    host: process.env.EMAIL_HOST?.trim(),
    port: Number(process.env.EMAIL_PORT || 587),
    secure: process.env.EMAIL_SECURE === "true",
    user: process.env.EMAIL_USER?.trim(),
    pass: process.env.EMAIL_PASS?.replace(/\s+/g, ""),
    from: (process.env.EMAIL_FROM || process.env.EMAIL_USER)?.trim(),
  };

  if (!config.host || !config.user || !config.pass || !config.from) {
    throw new Error("EMAIL_NOT_CONFIGURED");
  }

  return config;
};

const createTransporter = () => {
  const config = getRequiredMailConfig();

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
};

const sendPasswordResetOtp = async ({ email, otp }) => {
  const transporter = createTransporter();
  const config = getRequiredMailConfig();

  await transporter.sendMail({
    from: config.from,
    to: email,
    subject: "Ma OTP dat lai mat khau",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
        <h2>Dat lai mat khau</h2>
        <p>Ma OTP cua ban la:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px; color: #d5001c;">
          ${otp}
        </p>
        <p>Ma co hieu luc trong 10 phut.</p>
        <p>Neu ban khong yeu cau dat lai mat khau, vui long bo qua email nay.</p>
      </div>
    `,
    text: `Ma OTP dat lai mat khau cua ban la ${otp}. Ma co hieu luc trong 10 phut.`,
  });
};

module.exports = {
  sendPasswordResetOtp,
};
