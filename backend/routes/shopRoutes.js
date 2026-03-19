const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const Category = require("../models/Category");
const User = require("../models/User");
const Favorite = require("../models/Favorite");

// SHOP
router.get("/", async (req, res) => {
  try {
    const { category, minPrice, maxPrice, search, sort } = req.query;

    let filter = {};

    if (category) {
      const cat = await Category.findOne({ name: category });
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

    let query = Product.find(filter);

    if (sort === "price_asc") {
      query = query.sort({ price: 1 });
    } else if (sort === "price_desc") {
      query = query.sort({ price: -1 });
    }

    const products = await query.lean();
    const categories = await Category.find().lean();

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
    const product = await Product.findById(req.params.id).lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    const relatedProducts = await Product.find({
      id_category: product.id_category,
      _id: { $ne: product._id },
    })
      .limit(4)
      .lean();

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
      .populate("items.product")
      .lean();

    res.json({
      success: true,
      products: (favoriteDoc?.items || [])
        .map((item) => item.product)
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
