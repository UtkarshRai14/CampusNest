const express = require('express');
const chatController = require('../controllers/chat.controller');
const { authenticate } = require('../middleware/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');
const limits = require('../middleware/rateLimit.middleware');

const router = express.Router();

router.post('/', authenticate, limits.aiIp, limits.aiUser, asyncHandler(chatController.chat));
router.post('/guest', limits.guestAi, asyncHandler(chatController.chatGuest));
router.delete('/history', authenticate, asyncHandler(chatController.clearHistory));
router.post('/agent', authenticate, limits.aiIp, limits.aiUser, asyncHandler(chatController.chatAgent));
router.post('/agent/search', authenticate, limits.aiIp, limits.aiUser, asyncHandler(chatController.chatAgentSearch));

module.exports = router;
