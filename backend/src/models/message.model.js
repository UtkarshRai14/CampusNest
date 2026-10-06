const pool = require('../db/pool');

const SELECT_WITH_SENDER = `
  SELECT m.*, u.name AS sender_name
  FROM messages m
  LEFT JOIN users u ON u.id = m.sender_id
`;

async function create({ content, senderId, listingId, receiverId }) {
  const { rows } = await pool.query(
    `INSERT INTO messages (content, sender_id, listing_id, receiver_id)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [content, senderId, listingId, receiverId]
  );
  const { rows: full } = await pool.query(`${SELECT_WITH_SENDER} WHERE m.id = $1`, [rows[0].id]);
  return full[0];
}

async function countBetween(listingId, userA, userB) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM messages
     WHERE listing_id = $1
       AND ((sender_id = $2 AND receiver_id = $3) OR (sender_id = $3 AND receiver_id = $2))`,
    [listingId, userA, userB]
  );
  return rows[0].count;
}

async function countFrom(listingId, fromUserId, toUserId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM messages
     WHERE listing_id = $1 AND sender_id = $2 AND receiver_id = $3`,
    [listingId, fromUserId, toUserId]
  );
  return rows[0].count;
}

async function findConversation(listingId, userA, userB) {
  const { rows } = await pool.query(
    `${SELECT_WITH_SENDER}
     WHERE m.listing_id = $1
       AND ((m.sender_id = $2 AND m.receiver_id = $3) OR (m.sender_id = $3 AND m.receiver_id = $2))
     ORDER BY m.created_at ASC, m.id ASC`,
    [listingId, userA, userB]
  );
  return rows;
}

async function findAllForUser(userId) {
  const { rows } = await pool.query(
    `SELECT * FROM messages WHERE sender_id = $1 OR receiver_id = $1 ORDER BY created_at ASC, id ASC`,
    [userId]
  );
  return rows;
}

async function countUnread(userId) {
  const { rows } = await pool.query(
    'SELECT COUNT(*)::int AS count FROM messages WHERE receiver_id = $1 AND is_read = FALSE',
    [userId]
  );
  return rows[0].count;
}

// Returns how many messages were newly marked as read.
async function markConversationRead(listingId, readerId, otherUserId) {
  const { rowCount } = await pool.query(
    `UPDATE messages SET is_read = TRUE
     WHERE listing_id = $1 AND receiver_id = $2 AND sender_id = $3 AND is_read = FALSE`,
    [listingId, readerId, otherUserId]
  );
  return rowCount;
}

// Returns the sender and receiver of each deleted message.
async function deleteConversation(listingId, userA, userB) {
  const { rows } = await pool.query(
    `DELETE FROM messages
     WHERE listing_id = $1
       AND ((sender_id = $2 AND receiver_id = $3) OR (sender_id = $3 AND receiver_id = $2))
     RETURNING sender_id, receiver_id`,
    [listingId, userA, userB]
  );
  return rows;
}

module.exports = {
  create,
  countBetween,
  countFrom,
  findConversation,
  findAllForUser,
  countUnread,
  markConversationRead,
  deleteConversation,
};
