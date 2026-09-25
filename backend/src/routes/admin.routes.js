const express = require('express');
const adminController = require('../controllers/admin.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get('/stats', asyncHandler(adminController.getStats));
router.get('/users', asyncHandler(adminController.getAllUsers));
router.get('/listings', asyncHandler(adminController.getAllListings));
router.delete('/listings/:id', asyncHandler(adminController.deleteListing));
router.delete('/users/:id', asyncHandler(adminController.deleteUser));

module.exports = router;
