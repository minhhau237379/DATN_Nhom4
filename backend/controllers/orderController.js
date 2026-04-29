const mongoose = require("mongoose");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Address = require("../models/Address");
const Voucher = require("../models/Voucher");
const { buildPaymentUrl, formatVnpDate, verifyReturnParams } = require("../utils/vnpay");
const {
  normalizeProductImages,
  getPrimaryProductImage,
  normalizeProductRecord,
} = require("../utils/product");
const {
  ORDER_STATUS,
  PAYMENT_STATUS,
  normalizeOrderStatus,
  normalizePaymentStatus,
  canCancelOrder,
  canMoveForward,
  isFinalOrderStatus,
} = require("../utils/orderStatus");
const {
  validateVoucherForOrder,
  consumeVoucher,
} = require("../utils/voucher");

const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];

  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }

  return req.ip || req.connection?.remoteAddress || "127.0.0.1";
};

const appendQueryParams = (baseUrl, params) => {
  const url = new URL(baseUrl);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
};

const normalizeOrderRecord = (order) => {
  if (!order) {
    return order;
  }

  return {
    ...order,
    orderStatus: normalizeOrderStatus(order.orderStatus),
    paymentStatus: normalizePaymentStatus(order.paymentStatus),
    subtotalPrice: Number(order.subtotalPrice || order.totalPrice || 0),
    discountAmount: Number(order.discountAmount || 0),
    items: (order.items || []).map((item) => ({
      ...item,
      image: normalizeProductImages(item.image),
    })),
  };
};

const buildOrderFilterByStatus = (value) => {
  if (!value) {
    return undefined;
  }

  const normalized = normalizeOrderStatus(value);
  return normalized;
};

const normalizeCheckoutItems = (items = []) =>
  items
    .map((item) => ({
      product: item.product?._id?.toString?.() || item.product?.toString?.() || item.product,
      quantity: Number(item.quantity || 0),
    }))
    .filter((item) => item.product)
    .sort((a, b) => {
      if (a.product === b.product) {
        return a.quantity - b.quantity;
      }

      return String(a.product).localeCompare(String(b.product));
    });

const sameCheckoutItems = (existingItems = [], nextItems = []) => {
  const left = normalizeCheckoutItems(existingItems);
  const right = normalizeCheckoutItems(nextItems);

  if (left.length !== right.length) {
    return false;
  }

  return left.every((item, index) => {
    const other = right[index];
    return item.product === other.product && item.quantity === other.quantity;
  });
};

const findReusableCheckoutOrder = async ({ userId, selectedAddressId, orderItems, session }) => {
  const candidates = await Order.find({
    user: userId,
    paymentMethod: "VNPAY",
    paymentStatus: { $ne: PAYMENT_STATUS.PAID },
  })
    .sort({ createdAt: -1 })
    .session(session);

  return candidates.find((order) => {
    const existingAddressId = order.shippingAddress?.addressId?.toString?.() || "";
    const nextAddressId = selectedAddressId?.toString?.() || "";

    if (existingAddressId !== nextAddressId) {
      return false;
    }

    return sameCheckoutItems(order.items || [], orderItems);
  });
};

const getPublicBaseUrl = (req) => {
  const envBaseUrl = process.env.PUBLIC_BACKEND_URL || process.env.APP_PUBLIC_URL;

  if (envBaseUrl) {
    return {
      baseUrl: envBaseUrl.replace(/\/+$/, ""),
      source: "env",
    };
  }

  const forwardedProto = Array.isArray(req.headers["x-forwarded-proto"])
    ? req.headers["x-forwarded-proto"][0]
    : req.headers["x-forwarded-proto"];
  const forwardedHost = Array.isArray(req.headers["x-forwarded-host"])
    ? req.headers["x-forwarded-host"][0]
    : req.headers["x-forwarded-host"];

  const proto = forwardedProto || req.protocol || "http";
  const host = forwardedHost || req.headers.host || `localhost:${process.env.PORT || 3003}`;
  const baseUrl = `${proto}://${host}`.replace(/\/+$/, "");

  return {
    baseUrl,
    source: "request",
  };
};

const loadCheckoutContext = async ({
  userId,
  addressId,
  selectedProductIds,
  directProductIds = [],
  session,
}) => {
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

  const directIds = Array.isArray(directProductIds)
    ? directProductIds.filter(Boolean)
    : [];

  if (directIds.length > 0) {
    const products = await Product.find({ _id: { $in: directIds } }).session(session);

    if (products.length !== directIds.length) {
      throw new Error("Khong tim thay san pham da chon");
    }

    for (const product of products) {
      if ((product.stock || 0) < 1) {
        throw new Error(`San pham ${product.name} khong du hang`);
      }
    }

    const orderItems = products.map((product) => ({
      product: product._id,
      name: product.name,
      image: getPrimaryProductImage(product.image),
      price: product.price,
      quantity: 1,
    }));

    const totalPrice = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    return {
      cart: null,
      cartItems: [],
      orderItems,
      totalPrice,
      selectedAddress,
    };
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
    throw new Error("Không tìm thấy sản phẩm đã chọn trong giỏ hàng");
  }

  for (const item of cartItems) {
    if (!item.product) {
      throw new Error("Sản phẩm không tồn tại");
    }

    if ((item.product.stock || 0) < item.quantity) {
      throw new Error(`Sản phẩm ${item.product.name} không đủ hàng`);
    }
  }

  const orderItems = cartItems.map((item) => ({
    product: item.product._id,
    name: item.product.name,
    image: getPrimaryProductImage(item.product.image),
    price: item.product.price,
    quantity: item.quantity,
  }));

  const totalPrice = orderItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  return {
    cart,
    cartItems,
    orderItems,
    totalPrice,
    selectedAddress,
  };
};

const finalizePaidOrder = async (order) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const lockedOrder = await Order.findById(order._id).session(session);

    if (!lockedOrder) {
      throw new Error("Khong tim thay don hang");
    }

    if (normalizePaymentStatus(lockedOrder.paymentStatus) === PAYMENT_STATUS.PAID) {
      await session.commitTransaction();
      return lockedOrder;
    }

    for (const item of lockedOrder.items) {
      const product = await Product.findById(item.product).session(session);

      if (!product) {
        throw new Error(`Sản phẩm ${item.name} không tồn tại`);
      }

      if ((product.stock || 0) < item.quantity) {
        throw new Error(`Sản phẩm ${item.name} không đủ hàng`);
      }
    }

    for (const item of lockedOrder.items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: -item.quantity } },
        { session },
      );
    }

    const cart = await Cart.findOne({ user: lockedOrder.user }).session(session);

    if (cart) {
      const selectedProductIds = lockedOrder.items.map((item) => item.product.toString());
      cart.items = cart.items.filter(
        (item) =>
          !item.product || !selectedProductIds.includes(item.product.toString()),
      );
      await cart.save({ session });
    }

    const shouldConsumeVoucher = Boolean(lockedOrder.voucher?.voucherId && !lockedOrder.paidAt);
    lockedOrder.paymentStatus = PAYMENT_STATUS.PAID;
    lockedOrder.orderStatus = ORDER_STATUS.WAITING_CONFIRM;
    lockedOrder.paidAt = lockedOrder.paidAt || new Date();
    if (shouldConsumeVoucher) {
      await consumeVoucher(lockedOrder.voucher.voucherId, session);
    }
    await lockedOrder.save({ session });

    await session.commitTransaction();
    return lockedOrder;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const markOrderFailed = async (order, responseCode) => {
  if (normalizePaymentStatus(order.paymentStatus) === PAYMENT_STATUS.PAID) {
    return order;
  }

  order.paymentStatus = PAYMENT_STATUS.UNPAID;
  order.orderStatus = ORDER_STATUS.CANCELLED;
  order.paymentResponseCode = responseCode || order.paymentResponseCode;
  await order.save();
  return order;
};

const restoreOrderStock = async (order, session) => {
  for (const item of order.items) {
    await Product.findByIdAndUpdate(
      item.product?._id || item.product,
      { $inc: { stock: item.quantity } },
      { session },
    );
  }
};

exports.listAvailableVouchers = async (req, res) => {
  try {
    const now = new Date();
    const vouchers = await Voucher.find({
      status: 1,
      $and: [
        { $or: [{ startDate: null }, { startDate: { $exists: false } }, { startDate: { $lte: now } }] },
        { $or: [{ endDate: null }, { endDate: { $exists: false } }, { endDate: { $gte: now } }] },
        {
          $or: [
            { usageLimit: 0 },
            { $expr: { $lt: ["$usedCount", "$usageLimit"] } },
          ],
        },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, vouchers });
  } catch (err) {
    console.error("LIST VOUCHERS ERROR:", err);
    res.status(500).json({ success: false, message: "Khong the tai voucher" });
  }
};

exports.validateVoucher = async (req, res) => {
  try {
    const subtotal = Number(req.body.subtotal || req.body.totalPrice || 0);
    const result = await validateVoucherForOrder(req.body.code, subtotal);

    res.json({
      success: true,
      voucher: result.voucherSnapshot,
      discountAmount: result.discountAmount,
      totalPrice: Math.max(subtotal - result.discountAmount, 0),
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message || "Voucher khong hop le",
    });
  }
};

exports.createOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    if (!req.session?.user?._id) {
      throw new Error("Bạn chưa đăng nhập");
    }

    const userId = req.session.user._id;
    const {
      addressId,
      paymentMethod = "COD",
      selectedProductIds = [],
      directProductIds = [],
      voucherCode = "",
    } = req.body;

    if (
      (!Array.isArray(selectedProductIds) || selectedProductIds.length === 0) &&
      (!Array.isArray(directProductIds) || directProductIds.length === 0)
    ) {
      throw new Error("Ban chua chon san pham nao");
    }

    const { cart, cartItems, orderItems, totalPrice, selectedAddress } =
      await loadCheckoutContext({
        userId,
        addressId,
        selectedProductIds,
        directProductIds,
        session,
      });
    const {
      voucher,
      discountAmount,
      voucherSnapshot,
    } = await validateVoucherForOrder(voucherCode, totalPrice, { session });
    const payableTotal = Math.max(totalPrice - discountAmount, 0);

    const reusableOrder = await findReusableCheckoutOrder({
      userId,
      selectedAddressId: selectedAddress._id,
      orderItems,
      session,
    });

    const orderData = {
      items: orderItems,
      subtotalPrice: totalPrice,
      discountAmount,
      voucher: voucherSnapshot,
      totalPrice: payableTotal,
      shippingAddress: {
        addressId: selectedAddress._id,
        fullName: selectedAddress.fullName,
        phone: selectedAddress.phone,
        address: selectedAddress.address,
        city: selectedAddress.city,
      },
      paymentMethod,
      paymentStatus: PAYMENT_STATUS.UNPAID,
      orderStatus: ORDER_STATUS.WAITING_CONFIRM,
      paymentTxnRef: undefined,
      paymentTransactionNo: undefined,
      paymentResponseCode: undefined,
      paymentReturnUrl: undefined,
      paidAt: undefined,
    };

    let savedOrder;

    if (reusableOrder) {
      Object.assign(reusableOrder, orderData);
      savedOrder = await reusableOrder.save({ session });
    } else {
      const createdOrders = await Order.create(
        [
          {
            user: userId,
            ...orderData,
          },
        ],
        { session },
      );

      savedOrder = createdOrders[0];
    }

    if (cart && cartItems.length) {
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
    } else {
      await Promise.all(
        orderItems.map((item) =>
          Product.findByIdAndUpdate(
            item.product,
            { $inc: { stock: -item.quantity } },
            { session },
          ),
        ),
      );
    }

    if (voucher) {
      await consumeVoucher(voucher._id, session);
    }

    await session.commitTransaction();

    res.json({
      success: true,
      message: "Dat hang thanh cong",
      order: normalizeOrderRecord(savedOrder.toObject()),
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

exports.createVnpayPayment = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const userId = req.authUserId;
    const {
      addressId,
      selectedProductIds = [],
      directProductIds = [],
      clientReturnUrl,
      bankCode = "",
      voucherCode = "",
    } = req.body;

    if (
      (!Array.isArray(selectedProductIds) || selectedProductIds.length === 0) &&
      (!Array.isArray(directProductIds) || directProductIds.length === 0)
    ) {
      throw new Error("Bạn chưa chọn sản phẩm nào");
    }

    if (!clientReturnUrl) {
      throw new Error("Thiếu đường dẫn quay lại ứng dụng");
    }

    const { orderItems, totalPrice, selectedAddress } = await loadCheckoutContext({
      userId,
      addressId,
      selectedProductIds,
      directProductIds,
      session,
    });
    const {
      discountAmount,
      voucherSnapshot,
    } = await validateVoucherForOrder(voucherCode, totalPrice, { session });
    const payableTotal = Math.max(totalPrice - discountAmount, 0);

    const reusableOrder = await findReusableCheckoutOrder({
      userId,
      selectedAddressId: selectedAddress._id,
      orderItems,
      session,
    });

    const orderPayload = {
      user: userId,
      items: orderItems,
      subtotalPrice: totalPrice,
      discountAmount,
      voucher: voucherSnapshot,
      totalPrice: payableTotal,
      shippingAddress: {
        addressId: selectedAddress._id,
        fullName: selectedAddress.fullName,
        phone: selectedAddress.phone,
        address: selectedAddress.address,
        city: selectedAddress.city,
      },
      paymentMethod: "VNPAY",
      paymentStatus: PAYMENT_STATUS.UNPAID,
      orderStatus: ORDER_STATUS.WAITING_CONFIRM,
      paymentReturnUrl: clientReturnUrl,
      paymentTxnRef: undefined,
      paymentTransactionNo: undefined,
      paymentResponseCode: undefined,
      paidAt: undefined,
    };

    let order;

    if (reusableOrder) {
      Object.assign(reusableOrder, orderPayload);
      order = await reusableOrder.save({ session });
    } else {
      const createdOrders = await Order.create([orderPayload], { session });
      order = createdOrders[0];
    }

    const tmnCode = process.env.VNP_TMNCODE;
    const hashSecret = process.env.VNP_HASHSECRET;
    const vnpUrl = process.env.VNP_URL;
    const vnpReturnUrl = process.env.VNP_RETURN_URL;
    const { baseUrl: publicBaseUrl, source } = getPublicBaseUrl(req);
    const returnUrl = vnpReturnUrl || `${publicBaseUrl}/payment/vnpay/return`;

    if (!tmnCode || !hashSecret || !vnpUrl || !returnUrl) {
      throw new Error("Cau hinh VNPAY chua day du");
    }

    if (!vnpReturnUrl && source === "request") {
      console.warn(
        `[VNPAY] Chua co VNP_RETURN_URL, dang tam su dung return URL: ${returnUrl}.`,
      );
    }

    const params = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: tmnCode,
      vnp_Locale: "vn",
      vnp_CurrCode: "VND",
      vnp_TxnRef: order.orderNumber,
      vnp_OrderInfo: `Thanh toan don hang ${order.orderNumber}`,
      vnp_OrderType: "other",
      vnp_Amount: Math.round(payableTotal * 100),
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: getClientIp(req),
      vnp_CreateDate: formatVnpDate(new Date()),
    };

    if (bankCode) {
      params.vnp_BankCode = bankCode;
    }

    const paymentUrl = buildPaymentUrl({
      baseUrl: vnpUrl,
      params,
      secret: hashSecret,
    });

    order.paymentTxnRef = order.orderNumber;
    await order.save({ session });

    await session.commitTransaction();

    res.json({
      success: true,
      message: "Tạo link thanh toán thành công",
      order: normalizeOrderRecord(order.toObject()),
      paymentUrl,
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("CREATE VNPAY PAYMENT ERROR:", err);

    res.status(400).json({
      success: false,
      message: err.message || "Không thể tạo thanh toán online",
    });
  } finally {
    session.endSession();
  }
};

exports.listOrders = async (req, res) => {
  try {
    const orders = (await Order.find({ user: req.authUserId }).sort({ createdAt: -1 }).lean()).map(
      normalizeOrderRecord,
    );
    res.json({ success: true, orders });
  } catch (err) {
    console.error("LIST ORDERS ERROR:", err);
    res.status(500).json({ success: false, message: "không thể tải đơn hàng" });
  }
};

exports.getOrderDetail = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.authUserId,
    }).lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng",
      });
    }

    res.json({ success: true, order: normalizeOrderRecord(order) });
  } catch (err) {
    console.error("GET ORDER DETAIL ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Không thể tải chi tiết đơn hàng",
    });
  }
};

exports.cancelOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const order = await Order.findOne({
      _id: req.params.id,
      user: req.authUserId,
    }).session(session);

    if (!order) {
      throw new Error("Không tìm thấy đơn hàng");
    }

    const currentStatus = normalizeOrderStatus(order.orderStatus);

    if (currentStatus === ORDER_STATUS.CANCELLED || currentStatus === ORDER_STATUS.COMPLETED) {
      throw new Error("Đơn hàng không thể hủy");
    }

    if (currentStatus !== ORDER_STATUS.WAITING_CONFIRM) {
      throw new Error("Đơn hàng đã được xác nhận nên không thể hủy");
    }

    const currentPayment = normalizePaymentStatus(order.paymentStatus);
    await restoreOrderStock(order, session);

    order.orderStatus = ORDER_STATUS.CANCELLED;
    order.paymentStatus = currentPayment;
    await order.save({ session });

    await session.commitTransaction();

    res.json({
      success: true,
      message: "Đã hủy đơn hàng",
      order: normalizeOrderRecord(order.toObject()),
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("CANCEL ORDER ERROR:", err);
    res.status(400).json({
      success: false,
      message: err.message || "Không thể hủy đơn hàng",
    });
  } finally {
    session.endSession();
  }
};

const handleVnpayCallback = async ({ query }) => {
  const isValidSignature = verifyReturnParams(
    query,
    process.env.VNP_HASHSECRET || "",
  );

  if (!isValidSignature) {
    return {
      success: false,
      code: "97",
      message: "Chữ ký không hợp lệ",
    };
  }

  const order = await Order.findOne({ orderNumber: query.vnp_TxnRef });

  if (!order) {
    return {
      success: false,
      code: "01",
      message: "Không tìm thấy đơn hàng",
    };
  }

  order.paymentTransactionNo = query.vnp_TransactionNo || order.paymentTransactionNo;
  order.paymentResponseCode = query.vnp_ResponseCode || order.paymentResponseCode;

  if (query.vnp_ResponseCode === "00") {
    const paidOrder = await finalizePaidOrder(order);
    return {
      success: true,
      code: "00",
      message: "Thanh toán thành công",
      order: normalizeOrderRecord(paidOrder.toObject()),
    };
  }

  const failedOrder = await markOrderFailed(order, query.vnp_ResponseCode);

  return {
    success: false,
    code: query.vnp_ResponseCode || "99",
    message: "Thanh toán thất bại hoặc bị hủy",
    order: normalizeOrderRecord(failedOrder.toObject()),
  };
};

exports.handleVnpayReturn = async (req, res) => {
  try {
    const result = await handleVnpayCallback({ query: req.query });

    const fallbackUrl = "mobile://checkout";
    const orderReturnUrl = result.order?.paymentReturnUrl || fallbackUrl;
    const redirectUrl = appendQueryParams(orderReturnUrl, {
      paymentStatus: result.success ? "success" : "failed",
      orderId: result.order?._id,
      paymentMessage: result.message,
    });

    return res.redirect(redirectUrl);
  } catch (err) {
    console.error("VNPAY RETURN ERROR:", err);
    return res.redirect(
      appendQueryParams("mobile://checkout", {
        paymentStatus: "failed",
        paymentMessage: "Co loi xay ra khi xu ly thanh toan",
      }),
    );
  }
};

exports.handleVnpayIpn = async (req, res) => {
  try {
    const result = await handleVnpayCallback({ query: req.query });

    return res.json({
      RspCode: result.code,
      Message: result.message,
    });
  } catch (err) {
    console.error("VNPAY IPN ERROR:", err);
    return res.json({
      RspCode: "99",
      Message: "Unknown error",
    });
  }
};
