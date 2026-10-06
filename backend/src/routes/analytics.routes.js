const express = require('express');
const analyticsController = require('../controllers/analytics.controller');
const { authenticate } = require('../middleware/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/trending', asyncHandler(analyticsController.getTrending));
router.get('/summary', asyncHandler(analyticsController.getSummary));
router.get('/recommendations/:userId', authenticate, asyncHandler(analyticsController.getUserRecommendations));

module.exports = router;
