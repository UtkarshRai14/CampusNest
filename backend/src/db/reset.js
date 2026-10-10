const pool = require('./pool');
const { initDb } = require('./init');
const { seed } = require('./seed');

async function resetDatabase() {
  await initDb();
  await pool.query('BEGIN');
  try {
    await pool.query('TRUNCATE TABLE chat_history, messages, listings, users RESTART IDENTITY CASCADE');
    await pool.query('COMMIT');
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }

  await seed();
  console.log('[db] Database reset and seed data restored.');
}

module.exports = { resetDatabase };
