const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { sendPasswordResetOtp } = require("../utils/mailer");

const generateOtp = () => `${Math.floor(100000 + Math.random() * 900000)}`;

const buildLockedResponse = (user, message = "Tai khoan da bi khoa") => ({
  success: false,
  code: "ACCOUNT_LOCKED",
  message,
  lockReason: user.lockReason || "",
});

const buildToken = (user) =>
  jwt.sign(
    {
      id: user._id,
      username: user.username,
      role: user.role,
    },
    process.env.JWT_SECRET || "secret",
    { expiresIn: "7d" },
  );

const registerUser = async (req, res) => {
  try {
    const { username, email, password, phoneNumber } = req.body;

    const existed = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existed) {
      return res.status(400).json({
        success: false,
        message: "Username hoặc email đã tồn tại",
      });
    }

    const user = new User({
      username,
      email,
      password,
      phoneNumber,
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: "Đăng ký thành công",
    });
  } catch (error) {
    console.error("Registration error:", error);

    res.status(500).json({
      success: false,
      message: "Đăng ký thất bại",
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({
      $or: [{ username }, { email: username }],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Tài khoản không tồn tại",
      });
    }

    if (user.isLocked) {
      return res.status(403).json({
        ...buildLockedResponse(user),
      });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Mật khẩu không đúng",
      });
    }

    req.session.user = {
      _id: user._id,
      username: user.username,
      role: user.role,
    };

    const token = buildToken(user);

    res.status(200).json({
      success: true,
      message: "Đăng nhập thành công",
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: "Lỗi khi đăng nhập",
    });
  }
};

const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({
      $or: [{ username }, { email: username }],
      role: "admin",
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Tài khoản admin không tồn tại",
      });
    }

    if (user.isLocked) {
      return res.status(403).json({
        ...buildLockedResponse(user, "Tài khoản admin đã bị khóa"),
      });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Mật khẩu không đúng",
      });
    }

    req.session.user = {
      _id: user._id,
      username: user.username,
      role: user.role,
    };

    const token = buildToken(user);

    res.status(200).json({
      success: true,
      message: "Đăng nhập admin thành công",
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi đăng nhập admin",
    });
  }
};

const logoutUser = (req, res) => {
  req.session.destroy(() => {
    res.json({
      success: true,
      message: "Đăng xuất thành công",
    });
  });
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập email",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Email không tồn tại trong hệ thống",
      });
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpires = expiresAt;
    user.resetPasswordVerified = false;
    await user.save();

    try {
      await sendPasswordResetOtp({
        email: user.email,
        otp,
      });
    } catch (mailError) {
      user.resetPasswordOtp = null;
      user.resetPasswordOtpExpires = null;
      user.resetPasswordVerified = false;
      await user.save();
      throw mailError;
    }

    res.json({
      success: true,
      message: "Mã xác nhận đã được gửi tới email của bạn",
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    if (error.message === "EMAIL_NOT_CONFIGURED") {
      return res.status(500).json({
        success: false,
        message: "Hệ thống gửi email chưa được cấu hình",
      });
    }

    res.status(500).json({
      success: false,
      message: "Không thể gửi mã xác nhận",
    });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Thiếu email hoặc OTP",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user || !user.resetPasswordOtp || !user.resetPasswordOtpExpires) {
      return res.status(400).json({
        success: false,
        message: "Mã OTP không hợp lệ",
      });
    }

    if (user.resetPasswordOtpExpires.getTime() < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "Mã OTP đã hết hạn",
      });
    }

    if (user.resetPasswordOtp !== otp.trim()) {
      return res.status(400).json({
        success: false,
        message: "Mã OTP không đúng",
      });
    }

    user.resetPasswordVerified = true;
    await user.save();

    res.json({
      success: true,
      message: "Xác nhận OTP thành công",
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Không thể xác nhận OTP",
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Thiếu email hoặc mật khẩu mới",
      });
    }

    if (newPassword.length < 8 || newPassword.length > 16) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu phải từ 8-16 ký tự",
      });
    }

    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu phải có ít nhất 1 chữ hoa",
      });
    }

    if (!/[!@#$%^&*]/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu phải có ít nhất 1 ký tự đặc biệt",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Email không tồn tại trong hệ thống",
      });
    }

    if (!user.resetPasswordVerified) {
      return res.status(400).json({
        success: false,
        message: "Bạn chưa xác nhận OTP",
      });
    }

    user.password = newPassword;
    user.resetPasswordOtp = null;
    user.resetPasswordOtpExpires = null;
    user.resetPasswordVerified = false;
    await user.save();

    res.json({
      success: true,
      message: "Đặt lại mật khẩu thành công",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Không thể đặt lại mật khẩu",
    });
  }
};

module.exports = {
  register: registerUser,
  login: loginUser,
  adminLogin,
  logout: logoutUser,
  forgotPassword,
  verifyOtp,
  resetPassword,
};
