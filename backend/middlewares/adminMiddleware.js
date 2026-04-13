const jwt = require("jsonwebtoken");

const getToken = (req) => {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }

  if (req.session?.user?._id && req.session?.user?.role === "admin") {
    return null;
  }

  return null;
};

const requireAdmin = (req, res, next) => {
  try {
    if (req.session?.user?._id && req.session?.user?.role === "admin") {
      req.adminUser = req.session.user;
      return next();
    }

    const token = getToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Chưa đăng nhập admin",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");

    if (decoded.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Không có quyền truy cập",
      });
    }

    req.adminUser = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Token không hợp lệ",
    });
  }
};

module.exports = {
  requireAdmin,
};
