const fs = require("fs/promises");
const path = require("path");
const Product = require("../models/Product");
const Category = require("../models/Category");
const Order = require("../models/Order");
const User = require("../models/User");
const { saveImageBuffer, sanitizeFolderName } = require("../utils/storage");

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

const getCategoryFolderName = (category) =>
  sanitizeFolderName(category?.name || category?._id || category?.description || "uncategorized");

const resolveCategory = async (payloadCategoryId) => {
  if (!payloadCategoryId) {
    return null;
  }

  return Category.findById(payloadCategoryId).lean();
};

const saveUploadedProductImage = async ({ file, category }) => {
  if (!file) {
    return undefined;
  }

  return saveImageBuffer({
    buffer: file.buffer,
    folder: getCategoryFolderName(category),
    originalname: file.originalname,
  });
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

    const products = await Product.find(filter)
      .populate("id_category")
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      products,
    });
  } catch (err) {
    console.error("ADMIN LIST PRODUCTS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Khong the tai danh sach san pham",
    });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const categoryId = req.body.id_category || req.body.categoryId || null;
    const category = await resolveCategory(categoryId);
    const payload = {
      name: req.body.name?.trim(),
      price: normalizePrice(req.body.price),
      image: req.body.image || "",
      description: req.body.description || "",
      specifications: parseSpecifications(req.body.specifications),
      stock: normalizeStock(req.body.stock) ?? 0,
      status: normalizeStatus(req.body.status) ?? 1,
      id_category: categoryId,
    };

    if (req.file) {
      payload.image = await saveUploadedProductImage({ file: req.file, category });
    }

    const product = await Product.create(payload);
    const savedProduct = await Product.findById(product._id).populate("id_category");

    res.status(201).json({
      success: true,
      message: "Tao san pham thanh cong",
      product: savedProduct,
    });
  } catch (err) {
    console.error("ADMIN CREATE PRODUCT ERROR:", err);
    res.status(400).json({
      success: false,
      message: err.message || "Khong the tao san pham",
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
        message: "Khong tim thay san pham",
      });
    }

    const resolvedCategory = await resolveCategory(nextCategoryId || currentProduct.id_category?._id);
    const update = {
      name: req.body.name?.trim(),
      price: normalizePrice(req.body.price),
      image: req.body.image,
      description: req.body.description,
      specifications: parseSpecifications(req.body.specifications),
      stock: normalizeStock(req.body.stock),
      status: normalizeStatus(req.body.status),
      id_category: nextCategoryId,
    };

    if (req.file) {
      update.image = await saveUploadedProductImage({
        file: req.file,
        category: resolvedCategory,
      });
    }

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
        message: "Khong tim thay san pham",
      });
    }

    res.json({
      success: true,
      message: "Cap nhat san pham thanh cong",
      product,
    });
  } catch (err) {
    console.error("ADMIN UPDATE PRODUCT ERROR:", err);
    res.status(400).json({
      success: false,
      message: err.message || "Khong the cap nhat san pham",
    });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay san pham",
      });
    }

    res.json({
      success: true,
      message: "Xoa san pham thanh cong",
    });
  } catch (err) {
    console.error("ADMIN DELETE PRODUCT ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Khong the xoa san pham",
    });
  }
};

exports.updateProductStock = async (req, res) => {
  try {
    const stock = normalizeStock(req.body.stock);

    if (stock === undefined) {
      return res.status(400).json({
        success: false,
        message: "Stock khong hop le",
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
        message: "Khong tim thay san pham",
      });
    }

    res.json({
      success: true,
      message: "Cap nhat ton kho thanh cong",
      product,
    });
  } catch (err) {
    console.error("ADMIN UPDATE STOCK ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Khong the cap nhat ton kho",
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
        message: "Khong tim thay san pham",
      });
    }

    res.json({
      success: true,
      message: status === 1 ? "Da hien san pham" : "Da an san pham",
      product,
    });
  } catch (err) {
    console.error("ADMIN UPDATE PRODUCT STATUS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Khong the cap nhat trang thai san pham",
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
      message: "Khong the tai danh sach danh muc",
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
      message: "Tao danh muc thanh cong",
      category,
    });
  } catch (err) {
    console.error("ADMIN CREATE CATEGORY ERROR:", err);
    res.status(400).json({
      success: false,
      message: err.message || "Khong the tao danh muc",
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
        message: "Khong tim thay danh muc",
      });
    }

    res.json({
      success: true,
      message: "Cap nhat danh muc thanh cong",
      category,
    });
  } catch (err) {
    console.error("ADMIN UPDATE CATEGORY ERROR:", err);
    res.status(400).json({
      success: false,
      message: err.message || "Khong the cap nhat danh muc",
    });
  }
};

exports.updateCategoryStatus = async (req, res) => {
  try {
    const status = normalizeStatus(req.body.status);

    if (status === undefined) {
      return res.status(400).json({
        success: false,
        message: "Status khong hop le",
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
        message: "Khong tim thay danh muc",
      });
    }

    res.json({
      success: true,
      message: status === 1 ? "Da hien danh muc" : "Da an danh muc",
      category,
    });
  } catch (err) {
    console.error("ADMIN UPDATE CATEGORY STATUS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Khong the cap nhat trang thai danh muc",
    });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const linkedProduct = await Product.findOne({ id_category: req.params.id }).lean();

    if (linkedProduct) {
      return res.status(400).json({
        success: false,
        message: "Danh muc dang duoc su dung boi san pham",
      });
    }

    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay danh muc",
      });
    }

    res.json({
      success: true,
      message: "Xoa danh muc thanh cong",
    });
  } catch (err) {
    console.error("ADMIN DELETE CATEGORY ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Khong the xoa danh muc",
    });
  }
};

exports.listOrders = async (req, res) => {
  try {
    const { status, paymentStatus, search } = req.query;
    const filter = {};

    if (status) {
      filter.orderStatus = status;
    }

    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }

    if (search) {
      filter.orderNumber = { $regex: search, $options: "i" };
    }

    const orders = await Order.find(filter)
      .populate("user", "username email phoneNumber role")
      .populate("items.product")
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      orders,
    });
  } catch (err) {
    console.error("ADMIN LIST ORDERS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Khong the tai danh sach don hang",
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
        message: "Khong tim thay don hang",
      });
    }

    res.json({
      success: true,
      order,
    });
  } catch (err) {
    console.error("ADMIN ORDER DETAIL ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Khong the tai chi tiet don hang",
    });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const update = {};

    if (req.body.orderStatus) {
      update.orderStatus = req.body.orderStatus;
    }

    if (req.body.paymentStatus) {
      update.paymentStatus = req.body.paymentStatus;
    }

    if (req.body.trackingNumber !== undefined) {
      update.trackingNumber = req.body.trackingNumber;
    }

    if (req.body.paidAt !== undefined) {
      update.paidAt = req.body.paidAt ? new Date(req.body.paidAt) : null;
    }

    const order = await Order.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    })
      .populate("user", "username email phoneNumber role")
      .populate("items.product");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay don hang",
      });
    }

    res.json({
      success: true,
      message: "Cap nhat don hang thanh cong",
      order,
    });
  } catch (err) {
    console.error("ADMIN UPDATE ORDER ERROR:", err);
    res.status(400).json({
      success: false,
      message: err.message || "Khong the cap nhat don hang",
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
      totalOrders,
      paidOrders,
      recentOrders,
      topProducts,
    ] = await Promise.all([
      require("../models/User").countDocuments({ role: { $ne: "admin" } }),
      Product.countDocuments(),
      Category.countDocuments(),
      Product.countDocuments({ status: 1 }),
      Category.countDocuments({ status: 1 }),
      Order.countDocuments(),
      Order.find({
        $or: [{ paymentStatus: "paid" }, { orderStatus: "completed" }],
      }).select("totalPrice"),
      Order.find().sort({ createdAt: -1 }).limit(5).populate("user", "username").lean(),
      Order.aggregate([
        { $match: { $or: [{ paymentStatus: "paid" }, { orderStatus: "completed" }] } },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.product",
            name: { $first: "$items.name" },
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

    const revenue = paidOrders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalProducts,
        totalCategories,
        activeProducts,
        activeCategories,
        totalOrders,
        revenue,
        recentOrders,
        topProducts,
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
