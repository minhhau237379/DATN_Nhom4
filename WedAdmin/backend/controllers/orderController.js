const mongoose = require("mongoose");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Order = require("../models/Order");

exports.createOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // ✅ check login
    if (!req.session?.user?._id) {
      throw new Error("Bạn chưa đăng nhập");
    }

    const userId = req.session.user._id;
    const { shippingAddress } = req.body;

    // ✅ validate address
    if (!shippingAddress?.fullName || !shippingAddress?.phone) {
      throw new Error("Thiếu thông tin giao hàng");
    }

    // ✅ lấy cart (mỗi doc = 1 item)
    const cart = await Cart.findOne({ user: userId })
      .populate("items.product")
      .session(session);

    if (!cart || cart.items.length === 0) {
      throw new Error("Giỏ hàng trống");
    }

    const cartItems = cart.items;

    if (!cartItems || cartItems.length === 0) {
      throw new Error("Giỏ hàng trống");
    }

    // ✅ check tồn kho
    for (const item of cartItems) {
      if (!item.product) {
        throw new Error("Sản phẩm không tồn tại");
      }

      if (item.product.stock < item.quantity) {
        throw new Error(`Sản phẩm ${item.product.name} không đủ hàng`);
      }
    }

    // ✅ snapshot items
    const orderItems = cartItems.map((item) => ({
      product: item.product._id,
      name: item.product.name,
      image: item.product.image,
      price: item.product.price,
      quantity: item.quantity,
    }));

    // ✅ tính tiền
    const totalPrice = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    // ✅ tạo order
    const order = await Order.create(
      [
        {
          user: userId,
          items: orderItems,
          totalPrice,
          shippingAddress,
        },
      ],
      { session },
    );

    // ✅ trừ kho (đúng biến)
    await Promise.all(
      cartItems.map((item) =>
        Product.findByIdAndUpdate(
          item.product._id,
          { $inc: { stock: -item.quantity } },
          { session },
        ),
      ),
    );

    // ✅ clear cart đúng cách (QUAN TRỌNG)
    await Cart.deleteMany({ user: userId }).session(session);

    await session.commitTransaction();

    res.json({
      success: true,
      message: "Đặt hàng thành công",
      orderId: order[0]._id,
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("CREATE ORDER ERROR:", err);

    res.status(400).json({
      success: false,
      message: err.message || "Tạo đơn thất bại",
    });
  } finally {
    session.endSession();
  }
};
