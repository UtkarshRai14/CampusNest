const express = require('express');
const listingsController = require('../controllers/listings.controller');
const { authenticate } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.post('/', authenticate, upload.single('image'), asyncHandler(listingsController.createListing));
router.get('/', asyncHandler(listingsController.getListings));



router.get('/my-listings', authenticate, asyncHandler(listingsController.getMyListings));

router.get('/:id', asyncHandler(listingsController.getListing));
router.put('/:id', authenticate, asyncHandler(listingsController.updateListing));
router.delete('/:id', authenticate, asyncHandler(listingsController.deleteListing));

module.exports = router;
