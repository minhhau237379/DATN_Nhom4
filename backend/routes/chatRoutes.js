const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const chatController = require("../controllers/chatController");

router.use(verifyToken);

router.get("/thread", chatController.getUserThread);
router.post("/messages", chatController.sendUserMessage);

module.exports = router;
