const mongoose = require("mongoose");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Address = require("../models/Address");

exports.createOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    if (!req.session?.user?._id) {
      throw new Error("Ban chua dang nhap");
    }

    const userId = req.session.user._id;
    const { addressId, paymentMethod = "COD", selectedProductIds = [] } = req.body;

    if (!Array.isArray(selectedProductIds) || selectedProductIds.length === 0) {
      throw new Error("Ban chua chon san pham nao");
    }

    const addressDoc = await Address.findOne({ user: userId }).session(session);

    if (!addressDoc || !addressDoc.items?.length) {
      throw new Error("Khong tim thay dia chi giao hang");
    }

    const selectedAddress =
      addressDoc.items.find((item) => item._id.toString() === addressId) ||
      addressDoc.items.find((item) => item.isDefault) ||
      addressDoc.items[0];

    if (!selectedAddress) {
      throw new Error("Khong tim thay dia chi giao hang");
    }

    const cart = await Cart.findOne({ user: userId })
      .populate("items.product")
      .session(session);

    if (!cart || !cart.items.length) {
      throw new Error("Gio hang trong");
    }

    const cartItems = cart.items.filter(
      (item) =>
        item.product && selectedProductIds.includes(item.product._id.toString()),
    );

    if (!cartItems.length) {
      throw new Error("Khong tim thay san pham da chon trong gio hang");
    }

    for (const item of cartItems) {
      if (!item.product) {
        throw new Error("San pham khong ton tai");
      }

      if ((item.product.stock || 0) < item.quantity) {
        throw new Error(`San pham ${item.product.name} khong du hang`);
      }
    }

    const orderItems = cartItems.map((item) => ({
      product: item.product._id,
      name: item.product.name,
      image: item.product.image,
      price: item.product.price,
      quantity: item.quantity,
    }));

    const totalPrice = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    const isOnlinePayment = paymentMethod === "VNPAY";

    const order = await Order.create(
      [
        {
          user: userId,
          items: orderItems,
          totalPrice,
          shippingAddress: {
            addressId: selectedAddress._id,
            fullName: selectedAddress.fullName,
            phone: selectedAddress.phone,
            address: selectedAddress.address,
            city: selectedAddress.city,
          },
          paymentMethod,
          paymentStatus: isOnlinePayment ? "paid" : "pending",
          orderStatus: isOnlinePayment ? "confirmed" : "pending",
          paidAt: isOnlinePayment ? new Date() : undefined,
        },
      ],
      { session },
    );

    await Promise.all(
      cartItems.map((item) =>
        Product.findByIdAndUpdate(
          item.product._id,
          { $inc: { stock: -item.quantity } },
          { session },
        ),
      ),
    );

    cart.items = cart.items.filter(
      (item) =>
        !item.product || !selectedProductIds.includes(item.product._id.toString()),
    );

    await cart.save({ session });

    await session.commitTransaction();

    res.json({
      success: true,
      message: isOnlinePayment
        ? "Thanh toan online thanh cong"
        : "Dat hang thanh cong",
      order: order[0],
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("CREATE ORDER ERROR:", err);

    res.status(400).json({
      success: false,
      message: err.message || "Tao don that bai",
    });
  } finally {
    session.endSession();
  }
};

exports.listOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.authUserId }).sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (err) {
    console.error("LIST ORDERS ERROR:", err);
    res.status(500).json({ success: false, message: "Khong the tai don hang" });
  }
};

exports.getOrderDetail = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.authUserId,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay don hang",
      });
    }

    res.json({ success: true, order });
  } catch (err) {
    console.error("GET ORDER DETAIL ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Khong the tai chi tiet don hang",
    });
  }
};
