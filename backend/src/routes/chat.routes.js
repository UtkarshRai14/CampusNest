const express = require('express');
const chatController = require('../controllers/chat.controller');
const { authenticate } = require('../middleware/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.post('/', authenticate, asyncHandler(chatController.chat));
router.post('/guest', asyncHandler(chatController.chatGuest));
router.delete('/history', authenticate, asyncHandler(chatController.clearHistory));
router.post('/agent', asyncHandler(chatController.chatAgent));
router.post('/agent/search', asyncHandler(chatController.chatAgentSearch));

module.exports = router;
