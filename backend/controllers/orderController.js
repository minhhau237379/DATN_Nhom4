const mongoose = require("mongoose");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Address = require("../models/Address");
const { buildPaymentUrl, formatVnpDate, verifyReturnParams } = require("../utils/vnpay");

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

const loadCheckoutContext = async ({ userId, addressId, selectedProductIds, session }) => {
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

    if (lockedOrder.paymentStatus === "paid") {
      await session.commitTransaction();
      return lockedOrder;
    }

    for (const item of lockedOrder.items) {
      const product = await Product.findById(item.product).session(session);

      if (!product) {
        throw new Error(`San pham ${item.name} khong ton tai`);
      }

      if ((product.stock || 0) < item.quantity) {
        throw new Error(`San pham ${item.name} khong du hang`);
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

    lockedOrder.paymentStatus = "paid";
    lockedOrder.orderStatus = "confirmed";
    lockedOrder.paidAt = lockedOrder.paidAt || new Date();
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
  if (order.paymentStatus === "paid") {
    return order;
  }

  order.paymentStatus = "failed";
  order.paymentResponseCode = responseCode || order.paymentResponseCode;
  await order.save();
  return order;
};

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

    const { cart, cartItems, orderItems, totalPrice, selectedAddress } =
      await loadCheckoutContext({
        userId,
        addressId,
        selectedProductIds,
        session,
      });

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
          paymentStatus: "pending",
          orderStatus: "pending",
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
      message: "Dat hang thanh cong",
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

exports.createVnpayPayment = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const userId = req.authUserId;
    const {
      addressId,
      selectedProductIds = [],
      clientReturnUrl,
      bankCode = "",
    } = req.body;

    if (!Array.isArray(selectedProductIds) || selectedProductIds.length === 0) {
      throw new Error("Ban chua chon san pham nao");
    }

    if (!clientReturnUrl) {
      throw new Error("Thieu duong dan quay lai ung dung");
    }

    const { orderItems, totalPrice, selectedAddress } = await loadCheckoutContext({
      userId,
      addressId,
      selectedProductIds,
      session,
    });

    const createdOrders = await Order.create(
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
          paymentMethod: "VNPAY",
          paymentStatus: "pending",
          orderStatus: "pending",
          paymentReturnUrl: clientReturnUrl,
        },
      ],
      { session },
    );

    const order = createdOrders[0];
    const tmnCode = process.env.VNP_TMNCODE;
    const hashSecret = process.env.VNP_HASHSECRET;
    const vnpUrl = process.env.VNP_URL;
    const returnUrl = process.env.VNP_RETURN_URL;

    if (!tmnCode || !hashSecret || !vnpUrl || !returnUrl) {
      throw new Error("Cau hinh VNPAY chua day du");
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
      vnp_Amount: Math.round(totalPrice * 100),
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
      message: "Tao link thanh toan thanh cong",
      order,
      paymentUrl,
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("CREATE VNPAY PAYMENT ERROR:", err);

    res.status(400).json({
      success: false,
      message: err.message || "Khong the tao thanh toan online",
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

const handleVnpayCallback = async ({ query }) => {
  const isValidSignature = verifyReturnParams(
    query,
    process.env.VNP_HASHSECRET || "",
  );

  if (!isValidSignature) {
    return {
      success: false,
      code: "97",
      message: "Chu ky khong hop le",
    };
  }

  const order = await Order.findOne({ orderNumber: query.vnp_TxnRef });

  if (!order) {
    return {
      success: false,
      code: "01",
      message: "Khong tim thay don hang",
    };
  }

  order.paymentTransactionNo = query.vnp_TransactionNo || order.paymentTransactionNo;
  order.paymentResponseCode = query.vnp_ResponseCode || order.paymentResponseCode;

  if (query.vnp_ResponseCode === "00") {
    const paidOrder = await finalizePaidOrder(order);
    return {
      success: true,
      code: "00",
      message: "Thanh toan thanh cong",
      order: paidOrder,
    };
  }

  const failedOrder = await markOrderFailed(order, query.vnp_ResponseCode);

  return {
    success: false,
    code: query.vnp_ResponseCode || "99",
    message: "Thanh toan that bai hoac bi huy",
    order: failedOrder,
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
