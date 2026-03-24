const express = require("express");
const router = express.Router();
const Favorite = require("../models/Favorite");
const verifyToken = require("../middlewares/verifyToken");

// Xem danh sách sản phẩm yêu thích
router.get("/", verifyToken, async (req, res) => {
  const favorites = await Favorite.find({
    user: req.user.id,
  })
    .populate("product")
    .lean();

  res.json({
    products: favorites.map((f) => f.product),
  });
});

// Toggle favorite
router.post("/toggle/:id", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const productId = req.params.id;

    const existing = await Favorite.findOne({
      user: userId,
      product: productId,
    });

    if (existing) {
      await Favorite.deleteOne({ _id: existing._id });
    } else {
      await Favorite.create({
        user: userId,
        product: productId,
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// Lấy list id favorite
router.get("/list", verifyToken, async (req, res) => {
  const favs = await Favorite.find({
    user: req.user.id,
  });

  res.json({
    favorites: favs.map((f) => f.product.toString()),
  });
});

module.exports = router;