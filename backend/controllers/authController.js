const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { sendPasswordResetOtp } = require("../utils/mailer");

const generateOtp = () => `${Math.floor(100000 + Math.random() * 900000)}`;

const registerUser = async (req, res) => {
  try {
    const { username, email, password, phoneNumber } = req.body;

    const existed = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existed) {
      return res.status(400).json({
        success: false,
        message: "Username hoac email da ton tai",
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
      message: "Dang ky thanh cong",
    });
  } catch (error) {
    console.error("Registration error:", error);

    res.status(500).json({
      success: false,
      message: "Error registering user",
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
        message: "Tai khoan khong ton tai",
      });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Mat khau khong dung",
      });
    }

    req.session.user = {
      _id: user._id,
      username: user.username,
    };

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
      },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "7d" },
    );

    res.status(200).json({
      success: true,
      message: "Dang nhap thanh cong",
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
        },
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: "Error logging in",
    });
  }
};

const logoutUser = (req, res) => {
  req.session.destroy(() => {
    res.json({
      success: true,
      message: "Dang xuat thanh cong",
    });
  });
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Vui long nhap email",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Email khong ton tai trong he thong",
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
      message: "Ma xac nhan da duoc gui toi email cua ban",
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    if (error.message === "EMAIL_NOT_CONFIGURED") {
      return res.status(500).json({
        success: false,
        message: "He thong gui email chua duoc cau hinh",
      });
    }

    res.status(500).json({
      success: false,
      message: "Khong the gui ma xac nhan",
    });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Thieu email hoac OTP",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user || !user.resetPasswordOtp || !user.resetPasswordOtpExpires) {
      return res.status(400).json({
        success: false,
        message: "Ma OTP khong hop le",
      });
    }

    if (user.resetPasswordOtpExpires.getTime() < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "Ma OTP da het han",
      });
    }

    if (user.resetPasswordOtp !== otp.trim()) {
      return res.status(400).json({
        success: false,
        message: "Ma OTP khong dung",
      });
    }

    user.resetPasswordVerified = true;
    await user.save();

    res.json({
      success: true,
      message: "Xac nhan OTP thanh cong",
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Khong the xac nhan OTP",
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Thieu email hoac mat khau moi",
      });
    }

    if (newPassword.length < 8 || newPassword.length > 16) {
      return res.status(400).json({
        success: false,
        message: "Mat khau phai tu 8-16 ky tu",
      });
    }

    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "Mat khau phai co it nhat 1 chu hoa",
      });
    }

    if (!/[!@#$%^&*]/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "Mat khau phai co it nhat 1 ky tu dac biet",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Email khong ton tai trong he thong",
      });
    }

    if (!user.resetPasswordVerified) {
      return res.status(400).json({
        success: false,
        message: "Ban chua xac nhan OTP",
      });
    }

    user.password = newPassword;
    user.resetPasswordOtp = null;
    user.resetPasswordOtpExpires = null;
    user.resetPasswordVerified = false;
    await user.save();

    res.json({
      success: true,
      message: "Dat lai mat khau thanh cong",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Khong the dat lai mat khau",
    });
  }
};

module.exports = {
  register: registerUser,
  login: loginUser,
  logout: logoutUser,
  forgotPassword,
  verifyOtp,
  resetPassword,
};
