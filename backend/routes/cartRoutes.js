const express = require("express");
const router = express.Router();
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const jwt = require("jsonwebtoken");

const getUserInfo = (req) => {
  if (req.session?.user?._id) {
    return {
      id: req.session.user._id,
      username: req.session.user.username,
    };
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    return {
      id: decoded.id,
      username: decoded.username,
    };
  } catch (err) {
    return null;
  }
};

router.get("/", async (req, res) => {
  try {
    const userInfo = getUserInfo(req);

    if (!userInfo) {
      return res.status(401).json({
        success: false,
        message: "Need login",
      });
    }

    const cart = await Cart.findOne({
      user: userInfo.id,
    }).populate("items.product");

    if (!cart) {
      return res.json({
        success: true,
        items: [],
        total: 0,
      });
    }

    let total = 0;

    cart.items.forEach((i) => {
      if (i.product) {
        total += i.product.price * i.quantity;
      }
    });

    res.json({
      success: true,
      items: cart.items,
      total,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

router.post("/add", async (req, res) => {
  try {
    const userInfo = getUserInfo(req);

    if (!userInfo) {
      return res.json({
        success: false,
        message: "Not logged in",
      });
    }

    const { productId } = req.body;
    const product = await Product.findById(productId);

    if (!product) {
      return res.json({
        success: false,
        message: "San pham khong ton tai",
      });
    }

    if ((product.stock || 0) <= 0) {
      return res.json({
        success: false,
        message: "San pham da het hang",
      });
    }

    let cart = await Cart.findOne({ user: userInfo.id });

    if (!cart) {
      cart = await Cart.create({
        user: userInfo.id,
        username: userInfo.username,
        items: [{ product: productId, quantity: 1 }],
      });
    } else {
      if (cart.username !== userInfo.username) {
        cart.username = userInfo.username;
      }

      const index = cart.items.findIndex(
        (i) => i.product.toString() === productId,
      );

      if (index > -1) {
        if (cart.items[index].quantity >= product.stock) {
          return res.json({
            success: false,
            message: "So luong vuot qua ton kho",
          });
        }

        cart.items[index].quantity += 1;
      } else {
        cart.items.push({ product: productId, quantity: 1 });
      }

      await cart.save();
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({
      success: false,
      message: "Khong the them vao gio hang",
    });
  }
});

router.post("/update", async (req, res) => {
  try {
    const userInfo = getUserInfo(req);

    if (!userInfo) {
      return res.json({
        success: false,
        message: "Ban can dang nhap",
      });
    }

    const { productId, change } = req.body;
    const product = await Product.findById(productId);

    if (!product) {
      return res.json({
        success: false,
        message: "San pham khong ton tai",
      });
    }

    const cart = await Cart.findOne({
      user: userInfo.id,
    });

    if (!cart) {
      return res.json({
        success: false,
        message: "Gio hang khong ton tai",
      });
    }

    if (cart.username !== userInfo.username) {
      cart.username = userInfo.username;
    }

    const item = cart.items.find(
      (i) => i.product.toString() === productId,
    );

    if (!item) {
      return res.json({
        success: false,
        message: "San pham khong co trong gio hang",
      });
    }

    const nextQuantity = item.quantity + change;

    if ((product.stock || 0) <= 0 && change > 0) {
      return res.json({
        success: false,
        message: "San pham da het hang",
      });
    }

    if (nextQuantity > product.stock) {
      return res.json({
        success: false,
        message: "So luong vuot qua ton kho",
      });
    }

    item.quantity = nextQuantity;

    if (item.quantity <= 0) {
      cart.items = cart.items.filter(
        (i) => i.product.toString() !== productId,
      );
    }

    await cart.save();

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({
      success: false,
      message: "Khong the cap nhat gio hang",
    });
  }
});

router.post("/delete", async (req, res) => {
  try {
    const userInfo = getUserInfo(req);

    if (!userInfo) {
      return res.json({ success: false });
    }

    const { productId } = req.body;

    const cart = await Cart.findOne({
      user: userInfo.id,
    });

    if (!cart) return res.json({ success: false });

    if (cart.username !== userInfo.username) {
      cart.username = userInfo.username;
    }

    cart.items = cart.items.filter(
      (i) => i.product.toString() !== productId,
    );

    await cart.save();

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
});

module.exports = router;
