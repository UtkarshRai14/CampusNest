const express = require('express');
const chatController = require('../controllers/chat.controller');
const { authenticate } = require('../middleware/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.post('/', authenticate, asyncHandler(chatController.chat));
router.post('/guest', asyncHandler(chatController.chatGuest));
router.delete('/history', authenticate, asyncHandler(chatController.clearHistory));
router.post('/agent', authenticate, asyncHandler(chatController.chatAgent));
router.post('/agent/search', authenticate, asyncHandler(chatController.chatAgentSearch));

module.exports = router;
