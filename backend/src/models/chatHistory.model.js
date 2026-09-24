const pool = require('../db/pool');

async function save(userId, role, content) {
  await pool.query(
    'INSERT INTO chat_history (user_id, role, content) VALUES ($1, $2, $3)',
    [userId, role, content]
  );
}

async function deleteForUser(userId) {
  await pool.query('DELETE FROM chat_history WHERE user_id = $1', [userId]);
}

module.exports = { save, deleteForUser };
