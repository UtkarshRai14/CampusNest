const { Server } = require('socket.io');
const env = require('../config/env');
const authService = require('./auth.service');
const messageModel = require('../models/message.model');

const MAX_UNREAD_SHOWN = 99;

let io;

// Every open tab of a user joins that user's room, so one emit reaches all of them.
const userRoom = (userId) => `user:${userId}`;

// Clients only listen. Changes still go through the REST API, which pushes the result here.
function initRealtime(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.clientUrl, credentials: true },
  });

  // The client connects with the same JWT it sends to the REST API.
  io.use((socket, next) => {
    authService.getUserFromToken(socket.handshake.auth.token)
      .then((user) => {
        if (!user) return next(new Error('Not authenticated'));
        socket.data.userId = user.id;
        return next();
      })
      .catch((err) => {
        console.error('[realtime] Socket authentication failed:', err);
        next(new Error('Could not validate credentials'));
      });
  });

  io.on('connection', (socket) => {
    socket.join(userRoom(socket.data.userId));
  });
}

async function getUnreadCount(userId) {
  const count = await messageModel.countUnread(userId);
  return Math.min(count, MAX_UNREAD_SHOWN);
}

// The change is already saved when a push runs, so a failed push is only logged.
// The client reloads the data when it next opens it or reconnects.
async function safely(push) {
  try {
    await push();
  } catch (err) {
    console.error('[realtime] Push failed:', err);
  }
}

// Each count is read before anything is sent, so a newer count (for example after the
// receiver reads the message) always reaches the client after the older one.
function notifyNewMessage(message) {
  return safely(async () => {
    const unreadCount = await getUnreadCount(message.receiver_id);
    io.to([userRoom(message.sender_id), userRoom(message.receiver_id)]).emit('message:new', message);
    io.to(userRoom(message.receiver_id)).emit('unread:count', { unread_count: unreadCount });
  });
}

function notifyRead(userId) {
  return safely(async () => {
    const unreadCount = await getUnreadCount(userId);
    io.to(userRoom(userId)).emit('unread:count', { unread_count: unreadCount });
  });
}

// Everyone who took part in the deleted messages reloads their conversations and badge.
function notifyMessagesDeleted(deletedMessages) {
  const userIds = new Set(deletedMessages.flatMap((m) => [m.sender_id, m.receiver_id]));
  return safely(() => Promise.all([...userIds].map(async (userId) => {
    const unreadCount = await getUnreadCount(userId);
    io.to(userRoom(userId)).emit('messages:deleted');
    io.to(userRoom(userId)).emit('unread:count', { unread_count: unreadCount });
  })));
}

module.exports = {
  initRealtime,
  getUnreadCount,
  notifyNewMessage,
  notifyRead,
  notifyMessagesDeleted,
};
