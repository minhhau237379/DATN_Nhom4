const router = require("express").Router();
const controller = require("../controllers/addressController");
const verifyToken = require("../middlewares/verifyToken");

router.get("/list", verifyToken, controller.list);
router.post("/add", verifyToken, controller.add);
router.post("/update/:id", verifyToken, controller.update);
router.post("/set-default/:id", verifyToken, controller.setDefault);
router.post("/delete/:id", verifyToken, controller.delete);

module.exports = router;
