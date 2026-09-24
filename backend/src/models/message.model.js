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


async function findConversation(listingId, userA, userB) {
  const { rows } = await pool.query(
    `${SELECT_WITH_SENDER}
     WHERE m.listing_id = $1
       AND ((m.sender_id = $2 AND m.receiver_id = $3) OR (m.sender_id = $3 AND m.receiver_id = $2))
     ORDER BY m.created_at ASC`,
    [listingId, userA, userB]
  );
  return rows;
}


async function findAllForUser(userId) {
  const { rows } = await pool.query(
    `SELECT * FROM messages WHERE sender_id = $1 OR receiver_id = $1`,
    [userId]
  );
  return rows;
}







async function countReceived(userId) {
  const { rows } = await pool.query(
    'SELECT COUNT(*)::int AS count FROM messages WHERE receiver_id = $1',
    [userId]
  );
  return rows[0].count;
}

async function deleteConversation(listingId, userA, userB) {
  await pool.query(
    `DELETE FROM messages
     WHERE listing_id = $1
       AND ((sender_id = $2 AND receiver_id = $3) OR (sender_id = $3 AND receiver_id = $2))`,
    [listingId, userA, userB]
  );
}

module.exports = {
  create,
  countBetween,
  findConversation,
  findAllForUser,
  countReceived,
  deleteConversation,
};
