const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    image: String,
    price: {
      type: Number,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
  },
  { _id: false },
);

const shippingAddressSchema = new mongoose.Schema(
  {
    addressId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    fullName: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [orderItemSchema],
    totalPrice: {
      type: Number,
      required: true,
    },
    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["COD", "VNPAY", "BANKING", "MOMO"],
      default: "COD",
    },
    paymentTxnRef: String,
    paymentTransactionNo: String,
    paymentResponseCode: String,
    paymentReturnUrl: String,
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded", "Chưa thanh toán", "Đã thanh toán"],
      default: "Chưa thanh toán",
    },
    orderStatus: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipping",
        "completed",
        "cancelled",
        "done",
        "cancel",
        "cho_xu_ly",
        "da_xac_nhan",
        "dang_xu_ly",
        "dang_giao_hang",
        "hoan_tat",
        "da_huy",
        "Chờ xác nhận",
        "Đã xác nhận",
        "Đang xử lý",
        "Đang giao hàng",
        "Hoàn tất",
        "Đã hủy",
      ],
      default: "Chờ xác nhận",
    },
    paidAt: Date,
    trackingNumber: String,
  },
  { timestamps: true },
);

orderSchema.pre("save", function (next) {
  if (!this.orderNumber) {
    this.orderNumber = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;
  }

  next();
});

module.exports = mongoose.model("Order", orderSchema);
