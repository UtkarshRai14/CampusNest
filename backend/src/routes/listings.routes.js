const express = require('express');
const listingsController = require('../controllers/listings.controller');
const { authenticate, optionalAuthenticate } = require('../middleware/auth.middleware');
const { upload, validateImage } = require('../middleware/upload.middleware');
const asyncHandler = require('../utils/asyncHandler');
const limits = require('../middleware/rateLimit.middleware');

const router = express.Router();

router.post('/', authenticate, limits.listingIp, limits.listingUser, upload.single('image'), validateImage, asyncHandler(listingsController.createListing));
router.get('/', optionalAuthenticate, asyncHandler(listingsController.getListings));

router.get('/my-listings', authenticate, asyncHandler(listingsController.getMyListings));

router.get('/:id', optionalAuthenticate, asyncHandler(listingsController.getListing));
router.put('/:id/availability', authenticate, asyncHandler(listingsController.updateListingAvailability));
router.put('/:id', authenticate, asyncHandler(listingsController.updateListing));
router.delete('/:id', authenticate, asyncHandler(listingsController.deleteListing));

module.exports = router;
