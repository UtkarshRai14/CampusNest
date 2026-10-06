const pool = require('../db/pool');

// Both messages of a turn are inserted in one statement so history never holds half a turn.
async function saveTurn(userId, userContent, modelContent) {
  await pool.query(
    `INSERT INTO chat_history (user_id, role, content)
     VALUES ($1, 'user', $2), ($1, 'model', $3)`,
    [userId, userContent, modelContent]
  );
}

// Latest `limit` messages for a user, returned oldest-first so they can be sent as context.
async function findRecent(userId, limit) {
  const { rows } = await pool.query(
    `SELECT role, content FROM (
       SELECT id, role, content FROM chat_history
       WHERE user_id = $1 ORDER BY id DESC LIMIT $2
     ) recent ORDER BY id ASC`,
    [userId, limit]
  );
  return rows;
}

async function deleteForUser(userId) {
  await pool.query('DELETE FROM chat_history WHERE user_id = $1', [userId]);
}

module.exports = { saveTurn, findRecent, deleteForUser };
