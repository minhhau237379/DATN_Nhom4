const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const Category = require("../models/Category");
const User = require("../models/User");
const Favorite = require("../models/Favorite");
const { normalizeProductRecord } = require("../utils/product");

const isVisibleProduct = (product) => product && product.id_category && product.id_category.status === 1;

// SHOP
router.get("/", async (req, res) => {
  try {
    const { category, minPrice, maxPrice, search, sort } = req.query;

    let filter = { status: 1 };

    if (category) {
      const cat = await Category.findOne({ name: category, status: 1 });
      if (cat) {
        filter.id_category = cat._id;
      }
    }

    if (minPrice && maxPrice) {
      filter.price = {
        $gte: Number(minPrice),
        $lte: Number(maxPrice),
      };
    }

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    let query = Product.find(filter).populate({
      path: "id_category",
      match: { status: 1 },
    });

    if (sort === "price_asc") {
      query = query.sort({ price: 1 });
    } else if (sort === "price_desc") {
      query = query.sort({ price: -1 });
    }

    const products = (await query.lean())
      .filter(isVisibleProduct)
      .map(normalizeProductRecord);
    const categories = await Category.find({ status: 1 }).lean();

    // 🔥 FAVORITES
    let favorites = [];

    if (req.session?.user) {
      const favoriteDoc = await Favorite.findOne({
        user: req.session.user._id,
      });

      favorites = (favoriteDoc?.items || []).map((item) =>
        item.product.toString(),
      );
    }

    res.json({
      products,
      categories,
      favorites,
    });
  } catch (err) {
  console.error(err);
  res.status(500).json({
    success: false,
    message: "Load shop failed"
  });
}
});

// PRODUCT DETAIL
router.get("/product/:id", async (req, res) => {
  try {
    const product = normalizeProductRecord(
      await Product.findOne({ _id: req.params.id, status: 1 })
        .populate({
          path: "id_category",
          match: { status: 1 },
        })
        .lean(),
    );

    if (!isVisibleProduct(product)) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    const relatedProducts = (await Product.find({
      id_category: product.id_category._id || product.id_category,
      _id: { $ne: product._id },
      status: 1,
    })
      .populate({
        path: "id_category",
        match: { status: 1 },
      })
      .limit(4)
      .lean())
      .filter(isVisibleProduct)
      .map(normalizeProductRecord);

    let favorites = [];

    if (req.session?.user) {
      const favoriteDoc = await Favorite.findOne({
        user: req.session.user._id,
      });

      favorites = (favoriteDoc?.items || []).map((item) =>
        item.product.toString(),
      );
    }

    res.json({
      success: true,
      product,
      relatedProducts,
      favorites,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Load product failed"
    });
  }
});

// FAVORITE PAGE
router.get("/favorites", async (req, res) => {
  try {

    if (!req.session?.user) {
      return res.status(401).json({
        success: false,
        message: "Bạn chưa đăng nhập"
      });
    }

    const favoriteDoc = await Favorite.findOne({
      user: req.session.user._id,
    })
      .populate({
        path: "items.product",
        match: { status: 1 },
      })
      .lean();

    res.json({
      success: true,
      products: (favoriteDoc?.items || [])
        .map((item) => normalizeProductRecord(item.product))
        .filter((product) => isVisibleProduct(product))
        .filter(Boolean),
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Lỗi load favorites"
    });
  }
});

module.exports = router;
