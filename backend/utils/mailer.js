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
  const appName = process.env.APP_NAME?.trim() || "Ứng dụng của bạn";
  const otpValue = String(otp);

  await transporter.sendMail({
    from: config.from,
    to: email,
    subject: `[${appName}] Yêu cầu đặt lại mật khẩu của bạn`,
    html: `
      <div style="margin:0;padding:0;background:linear-gradient(180deg,#f8fbff 0%,#eef4ff 100%);width:100%;">
        <div style="max-width:640px;margin:0 auto;padding:32px 16px;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;color:#1f2937;">
          <div style="background:#ffffff;border:1px solid #dbe4f0;border-radius:20px;overflow:hidden;box-shadow:0 12px 30px rgba(15,23,42,0.08);">
            <div style="background:linear-gradient(135deg,#1d4ed8 0%,#2563eb 45%,#60a5fa 100%);padding:28px 32px;text-align:center;color:#ffffff;">
              <div style="display:inline-block;padding:10px 16px;border-radius:999px;background:rgba(255,255,255,0.16);font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">${appName}</div>
              <h1 style="margin:16px 0 8px;font-size:28px;line-height:1.25;">Đặt lại mật khẩu</h1>
              <p style="margin:0;font-size:15px;opacity:0.95;">Bạn đã gửi yêu cầu đặt lại mật khẩu cho tài khoản của mình</p>
            </div>

            <div style="padding:32px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Xin chào,</p>
              <p style="margin:0 0 24px;font-size:16px;line-height:1.7;color:#334155;">
                Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.
                Vui lòng nhập mã OTP bên dưới để xác minh danh tính và tiếp tục tạo mật khẩu mới.
              </p>

              <div style="margin:28px 0;text-align:center;">
                <div style="display:inline-block;min-width:220px;padding:18px 28px;background:#eff6ff;border:2px dashed #60a5fa;color:#1d4ed8;font-size:34px;font-weight:800;letter-spacing:10px;border-radius:18px;">
                  ${otpValue}
                </div>
                <p style="margin:12px 0 0;font-size:13px;color:#64748b;">Mã OTP gồm 6 chữ số</p>
              </div>

              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:18px 20px;margin:0 0 24px;">
                <p style="margin:0 0 10px;font-size:15px;font-weight:700;color:#0f172a;">Lưu ý quan trọng</p>
                <ul style="margin:0;padding-left:20px;color:#475569;line-height:1.7;">
                  <li>Mã OTP có hiệu lực trong 10 phút.</li>
                  <li>Vui lòng không chia sẻ mã này với bất kỳ ai.</li>
                  <li>Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</li>
                </ul>
              </div>

              <p style="margin:0;font-size:16px;line-height:1.7;color:#334155;">
                Nếu bạn gặp khó khăn khi sử dụng mã OTP, hãy liên hệ với bộ phận hỗ trợ của chúng tôi để được giúp đỡ.
              </p>
              <p style="margin:18px 0 0;font-size:16px;line-height:1.7;">Trân trọng,</p>
              <p style="margin:0;font-size:16px;font-weight:700;color:#0f172a;">Đội ngũ hỗ trợ ${appName}</p>
            </div>
          </div>

          <p style="margin:16px 0 0;text-align:center;font-size:12px;color:#94a3b8;">
            Đây là email tự động từ ${appName}, vui lòng không trả lời trực tiếp.
          </p>
        </div>
      </div>
    `,
    text: `Bạn vừa yêu cầu đặt lại mật khẩu từ ${appName}. Mã OTP của bạn là ${otpValue}. Mã có hiệu lực trong 10 phút. Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.`,
  });
};

module.exports = {
  sendPasswordResetOtp,
};
