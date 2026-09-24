const express = require('express');
const usersController = require('../controllers/users.controller');
const { authenticate } = require('../middleware/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.post('/register', asyncHandler(usersController.register));
router.post('/login', asyncHandler(usersController.login));
router.get('/me', authenticate, asyncHandler(usersController.getMe));
router.put('/me', authenticate, asyncHandler(usersController.updateMe));

module.exports = router;
