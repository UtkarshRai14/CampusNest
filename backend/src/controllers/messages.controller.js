const messageModel = require('../models/message.model');
const userModel = require('../models/user.model');
const listingModel = require('../models/listing.model');
const realtime = require('../services/realtime.service');
const HttpError = require('../utils/HttpError');
const { parseText, parseId } = require('../utils/validators');

function messageToDict(msg) {
  return {
    id: msg.id,
    content: msg.content,
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
  const isFirstContact = !senderIsSeller
    && (await messageModel.countBetween(listingId, req.user.id, receiverId)) === 0;

  const newMessage = messageToDict(await messageModel.create({
    content, senderId: req.user.id, listingId, receiverId,
  }));
  await realtime.notifyNewMessage(newMessage);

  if (isFirstContact) {
    const seller = await userModel.findById(receiverId);
    const autoReply = await messageModel.create({
      content: buildAutoReply(req.user, seller, listing),
      senderId: receiverId,
      listingId,
      receiverId: req.user.id,
    });
    await realtime.notifyNewMessage(messageToDict(autoReply));
  }

  return res.json(newMessage);
}

async function getConversations(req, res) {
  const messages = await messageModel.findAllForUser(req.user.id);

  const userCache = new Map();
  const listingCache = new Map();
  const getUser = async (id) => {
    if (!userCache.has(id)) userCache.set(id, await userModel.findById(id));
    return userCache.get(id);
  };
  const getListing = async (id) => {
    if (!listingCache.has(id)) listingCache.set(id, await listingModel.findByIdAny(id));
    return listingCache.get(id);
  };

  const conversations = new Map();
  for (const msg of messages) {
    const otherUserId = msg.sender_id === req.user.id ? msg.receiver_id : msg.sender_id;
    const key = `${Math.min(req.user.id, otherUserId)}_${Math.max(req.user.id, otherUserId)}_${msg.listing_id}`;

    if (!conversations.has(key)) {
      const otherUser = await getUser(otherUserId);
      const listing = await getListing(msg.listing_id);
      conversations.set(key, {
        conversation_id: key,
        other_user_id: otherUserId,
        other_user_name: otherUser ? otherUser.name : 'Unknown',
        other_user_email: otherUser ? otherUser.email : '',
        other_user_whatsapp: otherUser ? (otherUser.whatsapp || null) : null,
        listing_id: msg.listing_id,
        listing_title: listing ? listing.title : 'Unknown',
        listing_seller_id: listing ? listing.seller_id : null,
        listing_image: listing ? listing.image_url : null,
        last_message: msg.content,
        last_message_time: msg.created_at,
        unread_count: 0,
      });
    }

    const conv = conversations.get(key);
    // Messages arrive oldest-first, so the last one seen is the latest.
    conv.last_message = msg.content;
    conv.last_message_time = msg.created_at;
    if (msg.receiver_id === req.user.id && !msg.is_read) conv.unread_count += 1;
  }

  const sorted = Array.from(conversations.values())
    .sort((a, b) => new Date(b.last_message_time) - new Date(a.last_message_time));
  return res.json({ conversations: sorted });
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

  await markRead(listingId, req.user.id, otherUserId);
  const messages = await messageModel.findConversation(listingId, req.user.id, otherUserId);
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
  const deleted = await messageModel.deleteConversation(listingId, req.user.id, otherUserId);
  await realtime.notifyMessagesDeleted(deleted);
  return res.json({ message: 'Conversation deleted' });
}

module.exports = {
  sendMessage,
  getConversations,
  getUnreadCount,
  getMessages,
  markConversationRead,
  deleteConversation,
};
