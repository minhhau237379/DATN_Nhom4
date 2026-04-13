const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async (req, res, next) => {

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: "Chưa đăng nhập"
    });
  }

  const token = authHeader.split(" ")[1];

  try {

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");

    const user = await User.findById(decoded.id).lean();

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Tai khoan khong ton tai"
      });
    }

    if (user.isLocked) {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_LOCKED",
        message: "Tai khoan da bi khoa",
        lockReason: user.lockReason || "",
      });
    }

    req.user = {
      id: user._id,
      username: user.username,
      role: user.role,
    };

    next();

  } catch (err) {

    return res.status(401).json({
      success: false,
      message: "Token không hợp lệ"
    });

  }
};
