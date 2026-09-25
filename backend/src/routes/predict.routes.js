const express = require('express');
const predictController = require('../controllers/predict.controller');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.post('/price', asyncHandler(predictController.getPricePrediction));

module.exports = router;
