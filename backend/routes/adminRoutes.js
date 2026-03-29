const upload = require("../middlewares/upload");
const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const adminController = require("../controllers/adminController");
const authMiddleware = require("../middlewares/authMiddleware");
const { requireAdmin } = require("../middlewares/adminMiddleware");

router.post("/auth/login", authMiddleware.validateLogin, authController.adminLogin);
router.post("/auth/logout", authController.logout);

router.use(requireAdmin);

router.get("/auth/me", (req, res) => {
  res.json({
    success: true,
    user: req.adminUser,
  });
});

router.get("/products", adminController.listProducts);
router.post("/products", upload.array("imageFiles", 10), adminController.createProduct);
router.put("/products/:id", upload.array("imageFiles", 10), adminController.updateProduct);
router.patch("/products/:id/stock", adminController.updateProductStock);
router.patch("/products/:id/status", adminController.updateProductStatus);
router.delete("/products/:id", adminController.deleteProduct);

router.get("/categories", adminController.listCategories);
router.post("/categories", adminController.createCategory);
router.put("/categories/:id", adminController.updateCategory);
router.patch("/categories/:id/status", adminController.updateCategoryStatus);
router.delete("/categories/:id", adminController.deleteCategory);

router.get("/orders", adminController.listOrders);
router.get("/orders/:id", adminController.getOrderDetail);
router.patch("/orders/:id/status", adminController.updateOrderStatus);

router.get("/users", adminController.listUsers);
router.get("/users/:id", adminController.getUserDetail);
router.patch("/users/:id/lock", adminController.updateUserLockStatus);

router.get("/stats/overview", adminController.dashboardStats);

module.exports = router;
