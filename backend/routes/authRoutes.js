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

router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-otp', authController.verifyOtp);
router.post('/reset-password', authController.resetPassword);

router.post('/logout',
  authController.logout
);

module.exports = router;
