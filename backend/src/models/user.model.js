const pool = require('../db/pool');
const { withTransaction } = require('../db/transaction');

async function findByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0] || null;
}

// Case is ignored, the same way as the unique index on enrollment_no.
async function findByEnrollmentNo(enrollmentNo) {
  const { rows } = await pool.query('SELECT * FROM users WHERE UPPER(enrollment_no) = UPPER($1)', [enrollmentNo]);
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] || null;
}

async function create({ name, email, password, phone, department, school, semester, enrollmentNo }) {
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password, phone, department, school, semester, enrollment_no)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [name, email, password, phone || null, department, school, semester, enrollmentNo]
  );
  return rows[0];
}

async function updateProfile(id, { name, phone, semester, whatsapp }) {
  const fields = [];
  const values = [];
  let i = 1;

  if (name !== undefined) { fields.push(`name = $${i++}`); values.push(name); }
  if (phone !== undefined) { fields.push(`phone = $${i++}`); values.push(phone); }
  if (semester !== undefined) { fields.push(`semester = $${i++}`); values.push(semester); }
  if (whatsapp !== undefined) { fields.push(`whatsapp = $${i++}`); values.push(whatsapp); }

  if (fields.length === 0) {
    return findById(id);
  }

  values.push(id);
  const { rows } = await pool.query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return rows[0];
}

async function findAll() {
  const { rows } = await pool.query('SELECT * FROM users ORDER BY id ASC');
  return rows;
}

async function countAll() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM users');
  return rows[0].count;
}

// Foreign keys block deleting a user who still has related rows, so remove them first.
// Returns the sender and receiver of each deleted message.
async function deleteById(id) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `DELETE FROM messages
       WHERE sender_id = $1 OR receiver_id = $1
          OR listing_id IN (SELECT id FROM listings WHERE seller_id = $1)
       RETURNING sender_id, receiver_id`,
      [id]
    );
    await client.query('DELETE FROM chat_history WHERE user_id = $1', [id]);
    await client.query('DELETE FROM listings WHERE seller_id = $1', [id]);
    await client.query('DELETE FROM users WHERE id = $1', [id]);
    return rows;
  });
}

module.exports = {
  findByEmail,
  findByEnrollmentNo,
  findById,
  create,
  updateProfile,
  findAll,
  countAll,
  deleteById,
};
