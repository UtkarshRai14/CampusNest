const express = require('express');
const usersController = require('../controllers/users.controller');
const { authenticate } = require('../middleware/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');
const limits = require('../middleware/rateLimit.middleware');

const router = express.Router();

router.post('/register', limits.authIp, asyncHandler(usersController.register));
router.post('/login', limits.authIp, asyncHandler(usersController.login));
router.get('/verify-email', asyncHandler(usersController.verifyEmail));
router.post('/resend-verification', limits.authIp, limits.resendEmail, asyncHandler(usersController.resendVerification));
router.post('/forgot-password', limits.authIp, limits.resendEmail, asyncHandler(usersController.forgotPassword));
router.post('/reset-password', limits.authIp, asyncHandler(usersController.resetPassword));
router.get('/me', authenticate, asyncHandler(usersController.getMe));
router.put('/me', authenticate, asyncHandler(usersController.updateMe));

module.exports = router;
