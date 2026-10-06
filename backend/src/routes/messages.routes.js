const express = require('express');
const messagesController = require('../controllers/messages.controller');
const { authenticate } = require('../middleware/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.post('/', authenticate, asyncHandler(messagesController.sendMessage));
router.get('/conversations', authenticate, asyncHandler(messagesController.getConversations));
router.get('/unread-count', authenticate, asyncHandler(messagesController.getUnreadCount));
router.get('/:listingId/:otherUserId', authenticate, asyncHandler(messagesController.getMessages));
router.post('/:listingId/:otherUserId/read', authenticate, asyncHandler(messagesController.markConversationRead));
router.delete('/:listingId/:otherUserId', authenticate, asyncHandler(messagesController.deleteConversation));

module.exports = router;
