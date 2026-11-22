const express = require('express');
const analyticsController = require('../controllers/analytics.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/trending', authenticate, requireAdmin, asyncHandler(analyticsController.getTrending));
router.get('/summary', authenticate, requireAdmin, asyncHandler(analyticsController.getSummary));
router.get('/recommendations/:userId', authenticate, asyncHandler(analyticsController.getUserRecommendations));

module.exports = router;
