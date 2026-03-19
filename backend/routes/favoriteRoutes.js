const express = require("express");
const router = express.Router();
const Favorite = require("../models/Favorite");
const verifyToken = require("../middlewares/verifyToken");

router.get("/", verifyToken, async (req, res) => {
  const favoriteDoc = await Favorite.findOne({
    user: req.user.id,
  })
    .populate("items.product")
    .lean();

  res.json({
    products: (favoriteDoc?.items || [])
      .map((item) => item.product)
      .filter(Boolean),
  });
});

router.post("/toggle/:id", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const username = req.user.username;
    const productId = req.params.id;

    let favoriteDoc = await Favorite.findOne({ user: userId });

    if (!favoriteDoc) {
      await Favorite.create({
        user: userId,
        username,
        items: [{ product: productId }],
      });

      return res.json({
        success: true,
        isFavorite: true,
      });
    }

    if (favoriteDoc.username !== username) {
      favoriteDoc.username = username;
    }

    const existingIndex = favoriteDoc.items.findIndex(
      (item) => item.product.toString() === productId,
    );

    if (existingIndex > -1) {
      favoriteDoc.items.splice(existingIndex, 1);
      await favoriteDoc.save();

      return res.json({
        success: true,
        isFavorite: false,
      });
    }

    favoriteDoc.items.push({ product: productId });
    await favoriteDoc.save();

    return res.json({
      success: true,
      isFavorite: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

router.get("/list", verifyToken, async (req, res) => {
  const favoriteDoc = await Favorite.findOne({
    user: req.user.id,
  });

  res.json({
    favorites: (favoriteDoc?.items || []).map((item) => item.product.toString()),
  });
});

module.exports = router;
