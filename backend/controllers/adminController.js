const fs = require("fs/promises");
const path = require("path");
const Product = require("../models/Product");
const Category = require("../models/Category");
const Order = require("../models/Order");
const Address = require("../models/Address");
const User = require("../models/User");
const Voucher = require("../models/Voucher");
const { saveImageBuffer, sanitizeFolderName } = require("../utils/storage");
const {
  normalizeProductImages,
  normalizeProductRecord,
  getPrimaryProductImage,
} = require("../utils/product");
const {
  ORDER_STATUS,
  PAYMENT_STATUS,
  normalizeOrderStatus,
  normalizePaymentStatus,
  orderStatusOptions,
  paymentStatusOptions,
  canMoveForward,
  isFinalOrderStatus,
} = require("../utils/orderStatus");
const { sendOrderStatusUpdateEmail } = require("../utils/mailer");

const normalizePrice = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const normalizeStock = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const normalizeNonNegativeNumber = (value, fallback = 0) => {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) return fallback;
  return parsed;
};

const normalizeDateInput = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const buildVoucherPayload = (body) => {
  const discountType = body.discountType === "amount" ? "amount" : "percent";
  const discountValue = normalizeNonNegativeNumber(body.discountValue);

  if (!body.code?.trim()) {
    throw new Error("Vui long nhap ma voucher");
  }

  if (discountValue <= 0) {
    throw new Error("Gia tri giam gia phai lon hon 0");
  }

  if (discountType === "percent" && discountValue > 100) {
    throw new Error("Voucher phan tram khong duoc vuot qua 100%");
  }

  return {
    code: String(body.code).trim().toUpperCase(),
    name: body.name?.trim() || "",
    discountType,
    discountValue,
    minOrderValue: normalizeNonNegativeNumber(body.minOrderValue),
    maxDiscount: normalizeNonNegativeNumber(body.maxDiscount),
    usageLimit: normalizeNonNegativeNumber(body.usageLimit),
    startDate: normalizeDateInput(body.startDate),
    endDate: normalizeDateInput(body.endDate),
    status: normalizeStatus(body.status) ?? 1,
  };
};

const parseSpecifications = (value) => {
  if (!value) {
    return {};
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).filter(([, item]) => item !== undefined && item !== null && String(item).trim() !== ""),
    );
  }

  try {
    const parsed = JSON.parse(value);

    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(([, item]) => item !== undefined && item !== null && String(item).trim() !== ""),
    );
  } catch (error) {
    return {};
  }
};

const normalizeStatus = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed === 0 ? 0 : 1;
};

const buildOrderStatusMatch = (value) => {
  if (!value) {
    return undefined;
  }

  const normalized = normalizeOrderStatus(value);
  const legacyMap = {
    [ORDER_STATUS.WAITING_CONFIRM]: ["pending", "cho_xu_ly"],
    [ORDER_STATUS.CONFIRMED]: ["confirmed", "da_xac_nhan"],
    [ORDER_STATUS.PROCESSING]: ["processing", "dang_xu_ly"],
    [ORDER_STATUS.SHIPPING]: ["shipping", "dang_giao_hang"],
    [ORDER_STATUS.COMPLETED]: ["completed", "done", "hoan_tat"],
    [ORDER_STATUS.CANCELLED]: ["cancelled", "cancel", "da_huy"],
  };

  return {
    $in: [normalized, ...(legacyMap[normalized] || [])],
  };
};

const buildPaymentStatusMatch = (value) => {
  if (!value) {
    return undefined;
  }

  const normalized = normalizePaymentStatus(value);
  const legacyMap = {
    [PAYMENT_STATUS.UNPAID]: ["pending", "failed", "refunded", "chua_thanh_toan"],
    [PAYMENT_STATUS.PAID]: ["paid", "da_thanh_toan"],
  };

  return {
    $in: [normalized, ...(legacyMap[normalized] || [])],
  };
};

const buildRevenueEligibleMatch = () => ({
  $and: [
    { paymentStatus: buildPaymentStatusMatch(PAYMENT_STATUS.PAID) },
    { orderStatus: buildOrderStatusMatch(ORDER_STATUS.COMPLETED) },
  ],
});

const getCategoryFolderName = (category) =>
  sanitizeFolderName(category?.name || category?._id || category?.description || "uncategorized");

const resolveCategory = async (payloadCategoryId) => {
  if (!payloadCategoryId) {
    return null;
  }

  return Category.findById(payloadCategoryId).lean();
};

const saveUploadedProductImages = async ({ files, category }) => {
  if (!files || !files.length) {
    return [];
  }

  const savedImages = [];

  for (const file of files) {
    const savedPath = await saveImageBuffer({
      buffer: file.buffer,
      folder: getCategoryFolderName(category),
      originalname: file.originalname,
    });

    savedImages.push(savedPath);
  }

  return savedImages;
};

const restoreOrderStock = async (order) => {
  for (const item of order.items || []) {
    if (!item.product || !item.quantity) {
      continue;
    }

    await Product.findByIdAndUpdate(item.product?._id || item.product, {
      $inc: { stock: item.quantity },
    });
  }
};

const parseImageList = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return normalizeProductImages(value);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return normalizeProductImages(parsed);
      }
    } catch (error) {
      return normalizeProductImages(value);
    }
  }

  return normalizeProductImages(value);
};

exports.listProducts = async (req, res) => {
  try {
    const { search, categoryId, lowStock, status } = req.query;
    const filter = {};

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    if (categoryId) {
      filter.id_category = categoryId;
    }

    if (lowStock === "true") {
      filter.stock = { $lte: 5 };
    }

    if (status !== undefined && status !== "") {
      filter.status = normalizeStatus(status);
    }

    const products = (await Product.find(filter)
      .populate("id_category")
      .sort({ createdAt: -1 })
      .lean()).map(normalizeProductRecord);

    res.json({
      success: true,
      products,
    });
  } catch (err) {
    console.error("ADMIN LIST PRODUCTS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Không thể tải danh sách sản phẩm",
    });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const categoryId = req.body.id_category || req.body.categoryId || null;
    const category = await resolveCategory(categoryId);
    const uploadedImages = await saveUploadedProductImages({
      files: req.files || (req.file ? [req.file] : []),
      category,
    });
    const existingImages = parseImageList(req.body.images || req.body.image);
    const payload = {
      name: req.body.name?.trim(),
      price: normalizePrice(req.body.price),
      image: [...existingImages, ...uploadedImages],
      description: req.body.description || "",
      specifications: parseSpecifications(req.body.specifications),
      stock: normalizeStock(req.body.stock) ?? 0,
      status: normalizeStatus(req.body.status) ?? 1,
      id_category: categoryId,
    };

    const product = await Product.create(payload);
    const savedProduct = normalizeProductRecord(
      await Product.findById(product._id).populate("id_category").lean(),
    );

    res.status(201).json({
      success: true,
      message: "Tạo sản phẩm thành công",
      product: savedProduct,
    });
  } catch (err) {
    console.error("ADMIN CREATE PRODUCT ERROR:", err);
    res.status(400).json({
      success: false,
      message: err.message || "Không thể tạo sản phẩm",
    });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const nextCategoryId = req.body.id_category || req.body.categoryId;
    const currentProduct = await Product.findById(req.params.id).populate("id_category");

    if (!currentProduct) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
      });
    }

    const resolvedCategory = await resolveCategory(nextCategoryId || currentProduct.id_category?._id);
    const uploadedImages = await saveUploadedProductImages({
      files: req.files || (req.file ? [req.file] : []),
      category: resolvedCategory,
    });
    const existingImages = parseImageList(req.body.images || req.body.image || currentProduct.image);
    const update = {
      name: req.body.name?.trim(),
      price: normalizePrice(req.body.price),
      image: [...existingImages, ...uploadedImages],
      description: req.body.description,
      specifications: parseSpecifications(req.body.specifications),
      stock: normalizeStock(req.body.stock),
      status: normalizeStatus(req.body.status),
      id_category: nextCategoryId,
    };

    Object.keys(update).forEach((key) => {
      if (update[key] === undefined) {
        delete update[key];
      }
    });

    const product = await Product.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    }).populate("id_category");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
      });
    }

    res.json({
      success: true,
      message: "Cập nhật sản phẩm thành công",
      product,
    });
  } catch (err) {
    console.error("ADMIN UPDATE PRODUCT ERROR:", err);
    res.status(400).json({
      success: false,
      message: err.message || "Không thể cập nhật sản phẩm",
    });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
      });
    }

    res.json({
      success: true,
      message: "Xóa sản phẩm thành công",
    });
  } catch (err) {
    console.error("ADMIN DELETE PRODUCT ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Không thể xóa sản phẩm",
    });
  }
};

exports.updateProductStock = async (req, res) => {
  try {
    const stock = normalizeStock(req.body.stock);

    if (stock === undefined) {
      return res.status(400).json({
        success: false,
        message: "Stock không hợp lệ",
      });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { stock },
      { new: true, runValidators: true },
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
      });
    }

    res.json({
      success: true,
      message: "Cập nhật tồn kho thành công",
      product,
    });
  } catch (err) {
    console.error("ADMIN UPDATE STOCK ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Không thể cập nhật tồn kho",
    });
  }
};

exports.updateProductStatus = async (req, res) => {
  try {
    const status = normalizeStatus(req.body.status);

    if (status === undefined) {
      return res.status(400).json({
        success: false,
        message: "Status khong hop le",
      });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true },
    ).populate("id_category");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
      });
    }

    res.json({
      success: true,
      message: status === 1 ? "Đã hiển thị sản phẩm" : "Đã ẩn sản phẩm",
      product,
    });
  } catch (err) {
    console.error("ADMIN UPDATE PRODUCT STATUS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Không thể cập nhật trạng thái sản phẩm",
    });
  }
};

exports.listCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 }).lean();

    res.json({
      success: true,
      categories,
    });
  } catch (err) {
    console.error("ADMIN LIST CATEGORIES ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Không thể tải danh sách danh mục",
    });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const category = await Category.create({
      name: req.body.name?.trim(),
      description: req.body.description || "",
      status: normalizeStatus(req.body.status) ?? 1,
    });

    const folderPath = path.join(
      __dirname,
      "..",
      "public",
      "images",
      "products",
      sanitizeFolderName(category.name),
    );

    await fs.mkdir(folderPath, { recursive: true });

    res.status(201).json({
      success: true,
      message: "Tạo danh mục thành công",
      category,
    });
  } catch (err) {
    console.error("ADMIN CREATE CATEGORY ERROR:", err);
    res.status(400).json({
      success: false,
      message: err.message || "Không thể tạo danh mục",
    });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name?.trim(),
        description: req.body.description,
        status: normalizeStatus(req.body.status),
      },
      { new: true, runValidators: true },
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy danh mục",
      });
    }

    res.json({
      success: true,
      message: "Cập nhật danh mục thành công",
      category,
    });
  } catch (err) {
    console.error("ADMIN UPDATE CATEGORY ERROR:", err);
    res.status(400).json({
      success: false,
      message: err.message || "Không thể cập nhật danh mục",
    });
  }
};

exports.updateCategoryStatus = async (req, res) => {
  try {
    const status = normalizeStatus(req.body.status);

    if (status === undefined) {
      return res.status(400).json({
        success: false,
        message: "Status không hợp lệ",
      });
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true },
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy danh mục",
      });
    }

    res.json({
      success: true,
      message: status === 1 ? "Đã hiển thị danh mục" : "Đã ẩn danh mục",
      category,
    });
  } catch (err) {
    console.error("ADMIN UPDATE CATEGORY STATUS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Không thể cập nhật trạng thái danh mục",
    });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const linkedProduct = await Product.findOne({ id_category: req.params.id }).lean();

    if (linkedProduct) {
      return res.status(400).json({
        success: false,
        message: "Danh mục đang được sử dụng bởi sản phẩm",
      });
    }

    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy danh mục",
      });
    }

    res.json({
      success: true,
      message: "Xóa danh mục thành công",
    });
  } catch (err) {
    console.error("ADMIN DELETE CATEGORY ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Không thể xóa danh mục",
    });
  }
};

exports.listVouchers = async (req, res) => {
  try {
    const vouchers = await Voucher.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, vouchers });
  } catch (err) {
    console.error("ADMIN LIST VOUCHERS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Khong the tai danh sach voucher",
    });
  }
};

exports.createVoucher = async (req, res) => {
  try {
    const payload = buildVoucherPayload(req.body);
    const voucher = await Voucher.create(payload);

    res.status(201).json({
      success: true,
      message: "Tao voucher thanh cong",
      voucher,
    });
  } catch (err) {
    console.error("ADMIN CREATE VOUCHER ERROR:", err);
    res.status(400).json({
      success: false,
      message: err.code === 11000 ? "Ma voucher da ton tai" : err.message || "Khong the tao voucher",
    });
  }
};

exports.updateVoucher = async (req, res) => {
  try {
    const payload = buildVoucherPayload(req.body);
    const voucher = await Voucher.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });

    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay voucher",
      });
    }

    res.json({
      success: true,
      message: "Cap nhat voucher thanh cong",
      voucher,
    });
  } catch (err) {
    console.error("ADMIN UPDATE VOUCHER ERROR:", err);
    res.status(400).json({
      success: false,
      message: err.code === 11000 ? "Ma voucher da ton tai" : err.message || "Khong the cap nhat voucher",
    });
  }
};

exports.updateVoucherStatus = async (req, res) => {
  try {
    const status = normalizeStatus(req.body.status);

    if (status === undefined) {
      return res.status(400).json({
        success: false,
        message: "Trang thai khong hop le",
      });
    }

    const voucher = await Voucher.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true },
    );

    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay voucher",
      });
    }

    res.json({
      success: true,
      message: status === 1 ? "Da bat voucher" : "Da tat voucher",
      voucher,
    });
  } catch (err) {
    console.error("ADMIN UPDATE VOUCHER STATUS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Khong the doi trang thai voucher",
    });
  }
};

exports.deleteVoucher = async (req, res) => {
  try {
    const voucher = await Voucher.findByIdAndDelete(req.params.id);

    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay voucher",
      });
    }

    res.json({
      success: true,
      message: "Xoa voucher thanh cong",
    });
  } catch (err) {
    console.error("ADMIN DELETE VOUCHER ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Khong the xoa voucher",
    });
  }
};

exports.listOrders = async (req, res) => {
  try {
    const { status, paymentStatus, search } = req.query;
    const filter = {};

    if (status) {
      filter.orderStatus = buildOrderStatusMatch(status);
    }

    if (paymentStatus) {
      filter.paymentStatus = buildPaymentStatusMatch(paymentStatus);
    }

    if (search) {
      filter.orderNumber = { $regex: search, $options: "i" };
    }

    const orders = (await Order.find(filter)
      .populate("user", "username email phoneNumber role")
      .populate("items.product")
      .sort({ createdAt: -1 })
      .lean()).map((order) => ({
        ...order,
        orderStatus: normalizeOrderStatus(order.orderStatus),
        paymentStatus: normalizePaymentStatus(order.paymentStatus),
        cancelReason: order.cancelReason || "",
      }));

    res.json({
      success: true,
      orders,
    });
  } catch (err) {
    console.error("ADMIN LIST ORDERS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Không thể tải danh sách đơn hàng",
    });
  }
};

exports.getOrderDetail = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "username email phoneNumber role")
      .populate("items.product")
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng",
      });
    }

    res.json({
      success: true,
      order: {
        ...order,
        orderStatus: normalizeOrderStatus(order.orderStatus),
        paymentStatus: normalizePaymentStatus(order.paymentStatus),
        cancelReason: order.cancelReason || "",
      },
    });
  } catch (err) {
    console.error("ADMIN ORDER DETAIL ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Không thể tải chi tiết đơn hàng",
    });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    if (req.body.paymentStatus) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái thanh toán được cập nhật tự động",
      });
    }

    const order = await Order.findById(req.params.id)
      .populate("user", "username email phoneNumber role")
      .populate("items.product");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng",
      });
    }

    const currentStatus = normalizeOrderStatus(order.orderStatus);
    order.paymentStatus = normalizePaymentStatus(order.paymentStatus);
    order.orderStatus = currentStatus;
    if (isFinalOrderStatus(currentStatus)) {
      return res.status(400).json({
        success: false,
        message: "Đơn hàng đã hoàn tất hoặc đã hủy nên không thể chỉnh sửa",
      });
    }

    const nextStatus = req.body.orderStatus
      ? normalizeOrderStatus(req.body.orderStatus)
      : currentStatus;

    if (req.body.orderStatus && !canMoveForward(currentStatus, nextStatus)) {
      return res.status(400).json({
        success: false,
        message: "Không thể quay lại trạng thái trước đó",
      });
    }

    const cancellableStatuses = [
  ORDER_STATUS.WAITING_CONFIRM,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PROCESSING,
  ORDER_STATUS.SHIPPING,
];

if (nextStatus === ORDER_STATUS.CANCELLED && !cancellableStatuses.includes(currentStatus)) {
  return res.status(400).json({
    success: false,
    message: "Đơn hàng đã hoàn tất hoặc đã hủy nên không thể hủy",
  });
}


    const cancelReason =
      nextStatus === ORDER_STATUS.CANCELLED ? String(req.body.cancelReason || "").trim() : "";

    if (nextStatus === ORDER_STATUS.CANCELLED && !cancelReason) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập lý do hủy đơn hàng",
      });
    }

    if (req.body.trackingNumber !== undefined) {
      order.trackingNumber = req.body.trackingNumber;
    }

    if (req.body.paidAt !== undefined) {
      order.paidAt = req.body.paidAt ? new Date(req.body.paidAt) : null;
    }

    order.orderStatus = nextStatus;
    order.cancelReason = nextStatus === ORDER_STATUS.CANCELLED ? cancelReason : "";

    if (
      order.paymentMethod === "COD" &&
      nextStatus === ORDER_STATUS.COMPLETED &&
      normalizePaymentStatus(order.paymentStatus) !== PAYMENT_STATUS.PAID
    ) {
      order.paymentStatus = PAYMENT_STATUS.PAID;
      order.paidAt = order.paidAt || new Date();
    }

    if (nextStatus === ORDER_STATUS.CANCELLED && currentStatus !== ORDER_STATUS.CANCELLED) {
      await restoreOrderStock(order);
    }

    await order.save();

    const populatedOrder = await Order.findById(order._id)
      .populate("user", "username email phoneNumber role")
      .populate("items.product");

    const orderData = populatedOrder.toObject();

    if (orderData.user?.email && currentStatus !== nextStatus) {
      try {
        await sendOrderStatusUpdateEmail({
          email: orderData.user.email,
          orderNumber: orderData.orderNumber,
          customerName:
            orderData.user.username || orderData.shippingAddress?.fullName || "khách hàng",
          previousStatus: currentStatus,
          nextStatus,
          cancelReason: orderData.cancelReason || cancelReason,
          totalPrice: orderData.totalPrice,
        });
      } catch (mailError) {
        console.error("ADMIN ORDER STATUS EMAIL ERROR:", mailError);
      }
    }
    res.json({
      success: true,
      message: "Cập nhật đơn hàng thành công",
      order: {
        ...orderData,
        orderStatus: normalizeOrderStatus(orderData.orderStatus),
        paymentStatus: normalizePaymentStatus(orderData.paymentStatus),
        cancelReason: orderData.cancelReason || "",
      },
    });
  } catch (err) {
    console.error("ADMIN UPDATE ORDER ERROR:", err);
    res.status(400).json({
      success: false,
      message: err.message || "Không thể cập nhật đơn hàng",
    });
  }
};

exports.dashboardStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalProducts,
      totalCategories,
      activeProducts,
      activeCategories,
      allOrders,
      qualifiedOrders,
      recentOrders,
      topProducts,
    ] = await Promise.all([
      require("../models/User").countDocuments({ role: { $ne: "admin" } }),
      Product.countDocuments(),
      Category.countDocuments(),
      Product.countDocuments({ status: 1 }),
      Category.countDocuments({ status: 1 }),
      Order.find({})
        .select("orderStatus paymentStatus totalPrice createdAt")
        .lean(),
      Order.find(buildRevenueEligibleMatch())
        .select("orderStatus paymentStatus totalPrice createdAt")
        .lean(),
      Order.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("user", "username")
        .lean(),
      Order.aggregate([
        {
          $match: buildRevenueEligibleMatch(),
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.product",
            name: { $first: "$items.name" },
            image: { $first: "$items.image" },
            quantity: { $sum: "$items.quantity" },
            revenue: {
              $sum: { $multiply: ["$items.price", "$items.quantity"] },
            },
          },
        },
        { $sort: { quantity: -1 } },
        { $limit: 5 },
      ]),
    ]);

    const revenue = qualifiedOrders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
    const normalizedRecentOrders = recentOrders.map((order) => ({
      ...order,
      orderStatus: normalizeOrderStatus(order.orderStatus),
      paymentStatus: normalizePaymentStatus(order.paymentStatus),
    }));

    const statusCounts = Object.fromEntries(orderStatusOptions.map((status) => [status, 0]));
    const paymentCounts = Object.fromEntries(paymentStatusOptions.map((status) => [status, 0]));

    const monthlyMap = new Map(
      Array.from({ length: 6 }, (_, index) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (5 - index));
        const key = `${date.getFullYear()}-${date.getMonth()}`;

        return [
          key,
          {
            label: date.toLocaleDateString("vi-VN", { month: "short", year: "2-digit" }),
            orders: 0,
            revenue: 0,
          },
        ];
      }),
    );

    allOrders.forEach((order) => {
      const orderStatus = normalizeOrderStatus(order.orderStatus);
      const paymentStatus = normalizePaymentStatus(order.paymentStatus);

      if (statusCounts[orderStatus] !== undefined) {
        statusCounts[orderStatus] += 1;
      }

      if (paymentCounts[paymentStatus] !== undefined) {
        paymentCounts[paymentStatus] += 1;
      }

      const createdAt = order.createdAt ? new Date(order.createdAt) : null;
      if (!createdAt) {
        return;
      }

      const monthKey = `${createdAt.getFullYear()}-${createdAt.getMonth()}`;
      const bucket = monthlyMap.get(monthKey);

      if (!bucket) {
        return;
      }

      bucket.orders += 1;

      if (paymentStatus === PAYMENT_STATUS.PAID && orderStatus === ORDER_STATUS.COMPLETED) {
        bucket.revenue += Number(order.totalPrice || 0);
      }
    });

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalProducts,
        totalCategories,
        activeProducts,
        activeCategories,
        totalOrders: allOrders.length,
        revenue,
        recentOrders: normalizedRecentOrders,
        topProducts,
        orderStatusBreakdown: orderStatusOptions.map((status) => ({
          label: status,
          value: statusCounts[status] || 0,
        })),
        paymentStatusBreakdown: paymentStatusOptions.map((status) => ({
          label: status,
          value: paymentCounts[status] || 0,
        })),
        monthlyOrders: Array.from(monthlyMap.values()),
      },
    });
  } catch (err) {
    console.error("ADMIN STATS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Khong the tai thong ke",
    });
  }
};

exports.listUsers = async (req, res) => {
  try {
    const { search, locked } = req.query;
    const filter = { role: { $ne: "admin" } };

    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
      ];
    }

    if (locked !== undefined && locked !== "") {
      filter.isLocked = locked === "true";
    }

    const users = await User.find(filter).sort({ createdAt: -1 }).lean();

    res.json({
      success: true,
      users,
    });
  } catch (err) {
    console.error("ADMIN LIST USERS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Không thể tải danh sách người dùng",
    });
  }
};

exports.getUserDetail = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, role: { $ne: "admin" } }).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    const [addressDoc, recentOrders, totalOrders] = await Promise.all([
      Address.findOne({ user: user._id }).lean(),
      Order.find({ user: user._id }).sort({ createdAt: -1 }).limit(5).populate("items.product").lean(),
      Order.countDocuments({ user: user._id }),
    ]);

    res.json({
      success: true,
      user,
      addresses: addressDoc?.items || [],
      recentOrders: recentOrders.map((order) => ({
        ...order,
        orderStatus: normalizeOrderStatus(order.orderStatus),
        paymentStatus: normalizePaymentStatus(order.paymentStatus),
      })),
      stats: {
        totalOrders,
      },
    });
  } catch (err) {
    console.error("ADMIN USER DETAIL ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Không thể tải chi tiết người dùng",
    });
  }
};

exports.updateUserLockStatus = async (req, res) => {
  try {
    const { isLocked, lockReason = "" } = req.body;
    const locked = Boolean(isLocked);

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: { $ne: "admin" } },
      {
        isLocked: locked,
        lockReason: locked ? String(lockReason || "").trim() : "",
        lockedAt: locked ? new Date() : null,
      },
      { new: true, runValidators: true },
    ).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    res.json({
      success: true,
      message: locked ? "Đã khóa tài khoản" : "Đã mở khóa tài khoản",
      user,
    });
  } catch (err) {
    console.error("ADMIN UPDATE USER LOCK ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Không thể cập nhật trạng thái tài khoản",
    });
  }
};
