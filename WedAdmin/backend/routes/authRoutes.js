const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/register',
  authMiddleware.validateRegistration,
  authMiddleware.validatePassword,
  authMiddleware.checkDuplicateUser,
  authController.register
);

router.post('/login',
  authMiddleware.validateLogin,
  authController.login
);

router.post('/logout',
  authController.logout
);

module.exports = router;
