const express = require("express");
const orderController = require("../controllers/orderController");

const router = express.Router();

router.get("/return", orderController.handleVnpayReturn);
router.get("/ipn", orderController.handleVnpayIpn);

module.exports = router;
