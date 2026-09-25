const express = require('express');
const categoriesController = require('../controllers/categories.controller');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/', asyncHandler(categoriesController.getCategories));
router.get('/schools', asyncHandler(categoriesController.getSchools));
router.get('/listing-types', asyncHandler(categoriesController.getListingTypes));
router.get('/semesters/:schoolId', asyncHandler(categoriesController.getSemesters));

module.exports = router;
