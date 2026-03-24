const express = require("express");
const router = express.Router();
const User = require("../models/User");

// Middleware check login
const requireLogin = (req, res, next) => {
  if (!req.session?.user) {
    return res.status(401).json({
      success: false,
      message: "Vui lòng đăng nhập để truy cập trang này"
    });
  }
  next();
};

// ===== PROFILE PAGE =====
router.get("/", requireLogin, async (req, res) => {
  const user = await User.findById(req.session.user._id).lean();

  res.json({ user });
});

// ===== PROFILE INFO =====
router.get("/info", requireLogin, async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id).lean();

    res.json({
      success: true,
      user
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Lỗi tải thông tin user"
    });
  }
});

// ===== EDIT PROFILE =====
router.post("/profile/edit", requireLogin, async (req, res) => {
  const { username, phoneNumber } = req.body;

  await User.findByIdAndUpdate(req.session.user._id, {
    username,
    phoneNumber,
  });

  req.session.user.username = username;

  res.json({
    success: true,
    message: "Cập nhật thành công"
  });
});

// ===== UPDATE PROFILE =====
router.post("/profile/edit", requireLogin, async (req, res) => {
  try {
    const { username, phoneNumber } = req.body;

    const user = await User.findByIdAndUpdate(
      req.session.user._id,
      { username, phoneNumber },
      { new: true }
    );

    // update session
    req.session.user.username = user.username;

    res.json({
      success: true,
      message: "Cập nhật thông tin thành công",
      user
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Cập nhật thất bại"
    });
  }
});

module.exports = router;