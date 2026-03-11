const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// middleware check login nếu bạn có
function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({
      success: false,
      message: 'Chưa đăng nhập'
    });
  }
  next();
}

// ✅ API tạo đơn
router.post('/create', requireLogin, orderController.createOrder);

router.get("/", requireLogin, async (req, res) => {
  const orders = await require("../models/Order")
    .find({ user: req.session.user._id })
    .sort({ createdAt: -1 });

  res.json({ orders });
});

module.exports = router;