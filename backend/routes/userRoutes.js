const express = require("express");
const router = express.Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const getUserInfo = (req) => {
  if (req.session?.user?._id) {
    return {
      id: req.session.user._id,
      username: req.session.user.username,
    };
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    return {
      id: decoded.id,
      username: decoded.username,
    };
  } catch (err) {
    return null;
  }
};

const requireLogin = (req, res, next) => {
  const userInfo = getUserInfo(req);

  if (!userInfo) {
    return res.status(401).json({
      success: false,
      message: "Vui long dang nhap de truy cap trang nay",
    });
  }

  req.authUser = userInfo;
  next();
};

router.get("/", requireLogin, async (req, res) => {
  const user = await User.findById(req.authUser.id).lean();
  res.json({ user });
});

router.get("/info", requireLogin, async (req, res) => {
  try {
    const user = await User.findById(req.authUser.id).lean();

    res.json({
      success: true,
      user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Loi tai thong tin user",
    });
  }
});

router.post("/edit", requireLogin, async (req, res) => {
  try {
    const { username, phoneNumber } = req.body;

    const user = await User.findByIdAndUpdate(
      req.authUser.id,
      { username, phoneNumber },
      { new: true },
    );

    if (req.session?.user) {
      req.session.user.username = user.username;
    }

    res.json({
      success: true,
      message: "Cap nhat thong tin thanh cong",
      user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Cap nhat that bai",
    });
  }
});

router.post("/change-password", requireLogin, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.authUser.id);

    const isMatch = await bcrypt.compare(oldPassword, user.password);

    if (!isMatch) {
      return res.json({
        success: false,
        message: "Mat khau cu khong dung",
      });
    }

    // Let the User model pre-save hook hash the new password once.
    user.password = newPassword;

    await user.save();

    res.json({
      success: true,
      message: "Doi mat khau thanh cong",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Loi server",
    });
  }
});

module.exports = router;
