const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const orderController = require("../controllers/orderController");

const getUserId = (req) => {
  if (req.session?.user?._id) {
    return req.session.user._id;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    return decoded.id;
  } catch (err) {
    return null;
  }
};

function requireLogin(req, res, next) {
  const userId = getUserId(req);

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Chua dang nhap",
    });
  }

  if (!req.session) {
    req.session = {};
  }

  if (!req.session.user) {
    req.session.user = { _id: userId };
  }

  req.authUserId = userId;
  next();
}

router.post("/create", requireLogin, orderController.createOrder);
router.post("/create-vnpay-payment", requireLogin, orderController.createVnpayPayment);
router.get("/", requireLogin, orderController.listOrders);
router.get("/:id", requireLogin, orderController.getOrderDetail);

module.exports = router;
