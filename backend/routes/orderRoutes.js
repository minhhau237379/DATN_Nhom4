const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const orderController = require("../controllers/orderController");

const buildLockedResponse = (user) => ({
  success: false,
  code: "ACCOUNT_LOCKED",
  message: "Tai khoan da bi khoa",
  lockReason: user.lockReason || "",
});

const getUserInfo = async (req) => {
  if (req.session?.user?._id) {
    const user = await User.findById(req.session.user._id).lean();

    if (!user) {
      return null;
    }

    if (user.isLocked) {
      return { locked: true, lockReason: user.lockReason || "" };
    }

    return {
      id: user._id,
      username: user.username,
    };
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    const user = await User.findById(decoded.id).lean();

    if (!user) {
      return null;
    }

    if (user.isLocked) {
      return { locked: true, lockReason: user.lockReason || "" };
    }

    return {
      id: user._id,
      username: user.username,
    };
  } catch (err) {
    return null;
  }
};

async function requireLogin(req, res, next) {
  const userInfo = await getUserInfo(req);

  if (!userInfo) {
    return res.status(401).json({
      success: false,
      message: "Chua dang nhap",
    });
  }

  if (!req.session) {
    req.session = {};
  }

  if (userInfo.locked) {
    return res.status(403).json(buildLockedResponse(userInfo));
  }

  if (!req.session.user) {
    req.session.user = { _id: userInfo.id };
  }

  req.authUserId = userInfo.id;
  next();
}

router.post("/create", requireLogin, orderController.createOrder);
router.post("/create-vnpay-payment", requireLogin, orderController.createVnpayPayment);
router.get("/", requireLogin, orderController.listOrders);
router.get("/:id", requireLogin, orderController.getOrderDetail);
router.patch("/:id/cancel", requireLogin, orderController.cancelOrder);

module.exports = router;
