const messageModel = require('../models/message.model');
const userModel = require('../models/user.model');
const listingModel = require('../models/listing.model');
const HttpError = require('../utils/HttpError');

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


async function sendMessage(req, res) {
  const { content, listing_id: listingId, receiver_id: receiverId } = req.body || {};
  if (!content || listingId === undefined || receiverId === undefined) {
    throw new HttpError(422, [{ msg: 'content, listing_id and receiver_id are required' }]);
  }

  const listing = await listingModel.findByIdAny(listingId);
  if (!listing) throw new HttpError(404, 'Listing not found');
  if (listing.seller_id === req.user.id) throw new HttpError(400, 'Cannot message yourself');

  const newMessage = await messageModel.create({
    content, senderId: req.user.id, listingId, receiverId,
  });

  const existingCount = await messageModel.countBetween(listingId, req.user.id, receiverId);

  if (existingCount <= 1) {
    const seller = await userModel.findById(receiverId);
    if (seller) {
      const availability = seller.availability || 'after 7 PM';
      const whatsapp = seller.whatsapp || null;

      let autoText = `Hi ${req.user.name}! 👋 Thanks for your interest.\n\n`;
      autoText += `🕐 I am usually available ${availability}.\n`;
      autoText += `📧 Email: ${seller.email}\n`;
      if (whatsapp) autoText += `📱 WhatsApp: ${whatsapp}\n`;
      autoText += '\nFeel free to ask anything! 🙏';

      await messageModel.create({
        content: autoText, senderId: receiverId, listingId, receiverId: req.user.id,
      });
    }
  }

  return res.json(messageToDict(newMessage));
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
        listing_image: listing ? listing.image_url : null,
        last_message: msg.content,
        last_message_time: msg.created_at,
      });
    } else {
      const conv = conversations.get(key);
      if (new Date(msg.created_at) > new Date(conv.last_message_time)) {
        conv.last_message = msg.content;
        conv.last_message_time = msg.created_at;
      }
    }
  }

  return res.json({ conversations: Array.from(conversations.values()) });
}


async function getUnreadCount(req, res) {
  const count = await messageModel.countReceived(req.user.id);
  return res.json({ unread_count: Math.min(count, 99) });
}


async function getMessages(req, res) {
  const listingId = parseInt(req.params.listingId, 10);
  const otherUserId = parseInt(req.params.otherUserId, 10);
  const messages = await messageModel.findConversation(listingId, req.user.id, otherUserId);
  return res.json(messages.map(messageToDict));
}


async function deleteConversation(req, res) {
  const listingId = parseInt(req.params.listingId, 10);
  const otherUserId = parseInt(req.params.otherUserId, 10);
  await messageModel.deleteConversation(listingId, req.user.id, otherUserId);
  return res.json({ message: 'Deleted' });
}

module.exports = { sendMessage, getConversations, getUnreadCount, getMessages, deleteConversation };
