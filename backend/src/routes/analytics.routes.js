const express = require('express');
const analyticsController = require('../controllers/analytics.controller');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/trending', asyncHandler(analyticsController.getTrending));
router.get('/demand', asyncHandler(analyticsController.getDemand));
router.get('/summary', asyncHandler(analyticsController.getSummary));
router.get('/recommendations/:userId', asyncHandler(analyticsController.getUserRecommendations));

module.exports = router;
