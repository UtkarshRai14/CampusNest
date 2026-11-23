const messageModel = require('../models/message.model');
const userModel = require('../models/user.model');
const listingModel = require('../models/listing.model');
const realtime = require('../services/realtime.service');
const HttpError = require('../utils/HttpError');
const { parseText, parseId } = require('../utils/validators');
const { rejectsNewBuyerEnquiry } = require('../utils/messageRules');
const { sanitizeAutomaticReply } = require('../utils/contactPrivacy');

function messageToDict(msg) {
  return {
    id: msg.id,
    content: sanitizeAutomaticReply(msg.content, {
      isSellerMessage: msg.sender_id === msg.listing_seller_id,
      shareEmail: Boolean(msg.listing_seller_share_email),
      shareWhatsapp: Boolean(msg.listing_seller_share_whatsapp),
    }),
    sender_id: msg.sender_id,
    sender_name: msg.sender_name || 'Unknown',
    receiver_id: msg.receiver_id,
    listing_id: msg.listing_id,
    created_at: msg.created_at,
  };
}

function buildAutoReply(buyer, seller, listing) {
  let text = `Hi ${buyer.name}! 👋 Thanks for your interest in "${listing.title}".\n\n`;
  text += `📧 Email: ${seller.email}\n`;
  if (seller.whatsapp) text += `📱 WhatsApp: +91 ${seller.whatsapp}\n`;
  text += '\nFeel free to ask anything! 🙏\n(This is an automatic reply.)';
  return text;
}

// A listing conversation has exactly two people: the listing's seller and one buyer.
// The buyer starts it; the seller can reply only to a buyer who has already written to them.
async function assertCanMessage(listing, senderId, receiverId) {
  if (senderId === receiverId) throw new HttpError(400, 'Cannot message yourself');

  const receiver = await userModel.findById(receiverId);
  if (!receiver) throw new HttpError(404, 'Recipient not found');

  const senderIsSeller = listing.seller_id === senderId;
  if (senderIsSeller) {
    const buyerHasWritten = await messageModel.countFrom(listing.id, receiverId, senderId);
    if (buyerHasWritten === 0) {
      throw new HttpError(403, 'You can only reply to users who have messaged you about this listing');
    }
  } else if (receiverId !== listing.seller_id) {
    throw new HttpError(403, 'Messages about a listing can only be sent to its seller');
  }
  return { senderIsSeller };
}

async function sendMessage(req, res) {
  const body = req.body || {};
  const content = parseText(body.content, 'Message', { max: 2000 });
  const listingId = parseId(body.listing_id, 'Listing id');
  const receiverId = parseId(body.receiver_id, 'Receiver id');

  const listing = await listingModel.findByIdAny(listingId);
  if (!listing) throw new HttpError(404, 'Listing not found');

  const { senderIsSeller } = await assertCanMessage(listing, req.user.id, receiverId);
  const existingMessageCount = await messageModel.countBetween(listingId, req.user.id, receiverId);
  if (rejectsNewBuyerEnquiry({ listing, senderIsSeller, existingMessageCount })) {
    throw new HttpError(403, 'This listing is no longer accepting new enquiries');
  }
  const isFirstContact = !senderIsSeller && existingMessageCount === 0;

  const newMessage = messageToDict(await messageModel.create({
    content, senderId: req.user.id, listingId, receiverId,
  }));
  await realtime.notifyNewMessage(newMessage);

  if (isFirstContact) {
    const seller = await userModel.findById(receiverId);
    const privateAwareSeller = {
      ...seller,
      email: seller.share_email ? seller.email : '(not shared)',
      whatsapp: seller.share_whatsapp ? seller.whatsapp : null,
    };
    const autoReply = await messageModel.create({
      content: buildAutoReply(req.user, privateAwareSeller, listing),
      senderId: receiverId,
      listingId,
      receiverId: req.user.id,
    });
    await realtime.notifyNewMessage(messageToDict(autoReply));
  }

  return res.json(newMessage);
}

async function getConversations(req, res) {
  const conversations = (await messageModel.findConversationSummaries(req.user.id)).map((conversation) => {
    const {
      last_message_sender_id: lastMessageSenderId,
      listing_seller_share_email: shareEmail,
      listing_seller_share_whatsapp: shareWhatsapp,
      ...publicConversation
    } = conversation;
    return {
      ...publicConversation,
      last_message: sanitizeAutomaticReply(conversation.last_message, {
        isSellerMessage: lastMessageSenderId === conversation.listing_seller_id,
        shareEmail: Boolean(shareEmail),
        shareWhatsapp: Boolean(shareWhatsapp),
      }),
    };
  });
  return res.json({ conversations });
}

async function getUnreadCount(req, res) {
  return res.json({ unread_count: await realtime.getUnreadCount(req.user.id) });
}

// Marks the messages the reader received in a conversation as read and updates their badge.
async function markRead(listingId, readerId, otherUserId) {
  const marked = await messageModel.markConversationRead(listingId, readerId, otherUserId);
  if (marked > 0) await realtime.notifyRead(readerId);
}

// Opening a conversation marks the messages you received in it as read.
async function getMessages(req, res) {
  const listingId = parseId(req.params.listingId, 'Listing id');
  const otherUserId = parseId(req.params.otherUserId, 'User id');
  const beforeId = req.query.before_id === undefined ? null : parseId(req.query.before_id, 'Message cursor');
  const limit = req.query.limit === undefined ? 50 : parseId(req.query.limit, 'Limit');
  if (limit > 100) throw new HttpError(400, 'Limit must be at most 100');
  await markRead(listingId, req.user.id, otherUserId);
  const messages = await messageModel.findConversationPage(listingId, req.user.id, otherUserId, beforeId, limit);
  res.set('X-Has-More', String(messages.length === limit));
  res.set('X-Next-Before-Id', messages.length ? String(messages[0].id) : '');
  res.set('Access-Control-Expose-Headers', 'X-Has-More, X-Next-Before-Id');
  return res.json(messages.map(messageToDict));
}

// Called when a message arrives in a conversation the user already has open.
async function markConversationRead(req, res) {
  const listingId = parseId(req.params.listingId, 'Listing id');
  const otherUserId = parseId(req.params.otherUserId, 'User id');

  await markRead(listingId, req.user.id, otherUserId);
  return res.json({ message: 'Conversation marked as read' });
}

async function deleteConversation(req, res) {
  const listingId = parseId(req.params.listingId, 'Listing id');
  const otherUserId = parseId(req.params.otherUserId, 'User id');
  const hidden = await messageModel.hideConversation(listingId, req.user.id, otherUserId);
  if (!hidden) throw new HttpError(404, 'Conversation not found');
  await realtime.notifyConversationHidden(req.user.id);
  return res.json({ message: 'Conversation hidden from your inbox' });
}

module.exports = {
  sendMessage,
  getConversations,
  getUnreadCount,
  getMessages,
  markConversationRead,
  deleteConversation,
};
