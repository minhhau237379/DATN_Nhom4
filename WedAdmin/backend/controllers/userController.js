const User = require("../models/User");

const getProfile = async (req, res) => {
  try {
    // Chưa đăng nhập → đá về login
    if (!req.session?.user) {
      return res.redirect("/login");
    }

    const user = await User.findById(req.session.user._id).lean();

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Chưa đăng nhập",
      });
    }

    res.json({
      user,
    });
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).send("Lỗi tải thông tin cá nhân");
  }
};

module.exports = {
  getProfile,
};
