const pool = require('../db/pool');
const { withTransaction } = require('../db/transaction');

const SELECT_WITH_SENDER = `
  SELECT m.*, u.name AS sender_name,
         listing.seller_id AS listing_seller_id,
         seller.share_email AS listing_seller_share_email,
         seller.share_whatsapp AS listing_seller_share_whatsapp
  FROM messages m
  LEFT JOIN users u ON u.id = m.sender_id
  LEFT JOIN listings listing ON listing.id = m.listing_id
  LEFT JOIN users seller ON seller.id = listing.seller_id
`;

async function create({ content, senderId, listingId, receiverId }) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO messages (content, sender_id, listing_id, receiver_id)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [content, senderId, listingId, receiverId]
    );
    await client.query(
      `DELETE FROM hidden_conversations
       WHERE listing_id = $1
         AND ((user_id = $2 AND other_user_id = $3) OR (user_id = $3 AND other_user_id = $2))`,
      [listingId, senderId, receiverId]
    );
    const { rows: full } = await client.query(`${SELECT_WITH_SENDER} WHERE m.id = $1`, [rows[0].id]);
    return full[0];
  });
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

async function findConversationSummaries(userId) {
  const { rows } = await pool.query(
    `WITH conversation_messages AS (
       SELECT m.listing_id, m.sender_id, m.receiver_id, m.content, m.created_at, m.id,
              CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END AS other_user_id
       FROM messages m
       WHERE (m.sender_id = $1 OR m.receiver_id = $1) AND m.sender_id IS NOT NULL
     ), conversation_keys AS (
       SELECT DISTINCT listing_id, other_user_id FROM conversation_messages
     ), latest AS (
       SELECT DISTINCT ON (listing_id, other_user_id) *
       FROM conversation_messages
       ORDER BY listing_id, other_user_id, created_at DESC, id DESC
     ), unread AS (
       SELECT listing_id, sender_id AS other_user_id, COUNT(*)::int AS unread_count
       FROM messages
       WHERE receiver_id = $1 AND is_read = FALSE
       GROUP BY listing_id, sender_id
     )
     SELECT CONCAT(LEAST($1, k.other_user_id), '_', GREATEST($1, k.other_user_id), '_', k.listing_id) AS conversation_id,
            k.other_user_id,
            COALESCE(u.name, 'Unknown') AS other_user_name,
            CASE WHEN u.id = l.seller_id AND u.share_email THEN u.email ELSE '' END AS other_user_email,
            CASE WHEN u.id = l.seller_id AND u.share_whatsapp THEN u.whatsapp ELSE NULL END AS other_user_whatsapp,
            k.listing_id, COALESCE(l.title, 'Unknown') AS listing_title,
            l.seller_id AS listing_seller_id, l.image_url AS listing_image,
            latest.sender_id AS last_message_sender_id,
            COALESCE(seller.share_email, FALSE) AS listing_seller_share_email,
            COALESCE(seller.share_whatsapp, FALSE) AS listing_seller_share_whatsapp,
            latest.content AS last_message, latest.created_at AS last_message_time,
            COALESCE(unread.unread_count, 0) AS unread_count
     FROM conversation_keys k
     JOIN latest ON latest.listing_id = k.listing_id AND latest.other_user_id = k.other_user_id
     LEFT JOIN users u ON u.id = k.other_user_id
     LEFT JOIN listings l ON l.id = k.listing_id
     LEFT JOIN users seller ON seller.id = l.seller_id
     LEFT JOIN unread ON unread.listing_id = k.listing_id AND unread.other_user_id = k.other_user_id
     WHERE NOT EXISTS (
       SELECT 1 FROM hidden_conversations h
       WHERE h.user_id = $1 AND h.listing_id = k.listing_id AND h.other_user_id = k.other_user_id
     )
     ORDER BY latest.created_at DESC, latest.id DESC`,
    [userId]
  );
  return rows;
}

async function findConversationPage(listingId, userA, userB, beforeId, limit) {
  const { rows } = await pool.query(
    `${SELECT_WITH_SENDER}
     WHERE m.listing_id = $1
       AND ((m.sender_id = $2 AND m.receiver_id = $3) OR (m.sender_id = $3 AND m.receiver_id = $2))
       AND ($4::integer IS NULL OR (m.created_at, m.id) < (
         SELECT cursor.created_at, cursor.id FROM messages cursor
         WHERE cursor.id = $4 AND cursor.listing_id = $1
           AND ((cursor.sender_id = $2 AND cursor.receiver_id = $3)
             OR (cursor.sender_id = $3 AND cursor.receiver_id = $2))
       ))
     ORDER BY m.created_at DESC, m.id DESC
     LIMIT $5`,
    [listingId, userA, userB, beforeId, limit]
  );
  return rows.reverse();
}

async function countUnread(userId) {
  const { rows } = await pool.query(
    'SELECT COUNT(*)::int AS count FROM messages WHERE receiver_id = $1 AND is_read = FALSE',
    [userId]
  );
  return rows[0].count;
}

async function markConversationRead(listingId, readerId, otherUserId) {
  const { rowCount } = await pool.query(
    `UPDATE messages SET is_read = TRUE
     WHERE listing_id = $1 AND receiver_id = $2 AND sender_id = $3 AND is_read = FALSE`,
    [listingId, readerId, otherUserId]
  );
  return rowCount;
}

async function hideConversation(listingId, userId, otherUserId) {
  return withTransaction(async (client) => {
    const { rows: existing } = await client.query(
      `SELECT 1 FROM messages WHERE listing_id = $1
       AND ((sender_id = $2 AND receiver_id = $3) OR (sender_id = $3 AND receiver_id = $2))
       LIMIT 1`,
      [listingId, userId, otherUserId]
    );
    if (existing.length === 0) return false;

    await client.query(
      `UPDATE messages SET is_read = TRUE
       WHERE listing_id = $1 AND receiver_id = $2 AND sender_id = $3 AND is_read = FALSE`,
      [listingId, userId, otherUserId]
    );
    await client.query(
      `INSERT INTO hidden_conversations (user_id, listing_id, other_user_id)
       VALUES ($2, $1, $3)
       ON CONFLICT (user_id, listing_id, other_user_id) DO UPDATE SET hidden_at = EXCLUDED.hidden_at`,
      [listingId, userId, otherUserId]
    );
    return true;
  });
}

module.exports = {
  create,
  countBetween,
  countFrom,
  findConversationSummaries,
  findConversationPage,
  countUnread,
  markConversationRead,
  hideConversation,
};
