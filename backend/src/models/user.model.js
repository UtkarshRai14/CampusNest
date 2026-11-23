const pool = require('../db/pool');
const { withTransaction } = require('../db/transaction');

function emailDeliveryFailure(error) {
  const wrapped = new Error('Email delivery failed');
  wrapped.deliveryFailure = true;
  wrapped.cause = error;
  wrapped.code = error?.code;
  wrapped.name = error?.name || 'EmailDeliveryError';
  return wrapped;
}

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

async function create({
  name, email, password, phone, department, school, semester, enrollmentNo,
  emailVerificationTokenHash, emailVerificationExpiresAt,
}) {
  const { rows } = await pool.query(
    `INSERT INTO users
      (name, email, password, phone, department, school, semester, enrollment_no,
       email_verified, email_verification_token_hash, email_verification_expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, $9, $10)
     RETURNING *`,
    [name, email, password, phone || null, department, school, semester, enrollmentNo,
      emailVerificationTokenHash, emailVerificationExpiresAt]
  );
  return rows[0];
}

async function markEmailVerified(tokenHash) {
  const { rows } = await pool.query(
    `UPDATE users
     SET email_verified = TRUE, email_verification_token_hash = NULL,
         email_verification_expires_at = NULL
     WHERE email_verification_token_hash = $1
       AND email_verification_expires_at > (NOW() AT TIME ZONE 'utc')
     RETURNING *`,
    [tokenHash]
  );
  return rows[0] || null;
}

// Keep the row locked while delivery is attempted. The previous token is retained on
// SMTP failure, and competing resend requests cannot overwrite each other out of order.
async function resendVerification(id, tokenHash, expiresAt, send) {
  return withTransaction(async (client) => {
    const { rows } = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [id]);
    const user = rows[0];
    if (!user || user.email_verified) return false;

    try {
      await send(user);
    } catch (error) {
      throw emailDeliveryFailure(error);
    }
    await client.query(
      `UPDATE users SET email_verification_token_hash = $2,
         email_verification_expires_at = $3 WHERE id = $1 AND email_verified = FALSE`,
      [id, tokenHash, expiresAt]
    );
    return true;
  });
}

async function requestPasswordReset(email, tokenHash, expiresAt, send) {
  return withTransaction(async (client) => {
    const { rows } = await client.query('SELECT * FROM users WHERE email = $1 FOR UPDATE', [email]);
    const user = rows[0];
    if (!user || !user.email_verified) return false;

    try {
      await send(user);
    } catch (error) {
      throw emailDeliveryFailure(error);
    }
    await client.query(
      `UPDATE users SET password_reset_token_hash = $2, password_reset_expires_at = $3
       WHERE id = $1 AND email_verified = TRUE`,
      [user.id, tokenHash, expiresAt]
    );
    return true;
  });
}

async function consumePasswordReset(tokenHash, password) {
  const { rows } = await pool.query(
    `UPDATE users
     SET password = $2, password_reset_token_hash = NULL, password_reset_expires_at = NULL,
         token_version = token_version + 1
     WHERE password_reset_token_hash = $1
       AND password_reset_expires_at > (NOW() AT TIME ZONE 'utc')
     RETURNING id`,
    [tokenHash, password]
  );
  return rows[0] || null;
}

async function updateProfile(id, { name, phone, semester, whatsapp, shareEmail, shareWhatsapp }) {
  const fields = [];
  const values = [];
  let i = 1;

  if (name !== undefined) { fields.push(`name = $${i++}`); values.push(name); }
  if (phone !== undefined) { fields.push(`phone = $${i++}`); values.push(phone); }
  if (semester !== undefined) { fields.push(`semester = $${i++}`); values.push(semester); }
  if (whatsapp !== undefined) { fields.push(`whatsapp = $${i++}`); values.push(whatsapp); }
  if (shareEmail !== undefined) { fields.push(`share_email = $${i++}`); values.push(shareEmail); }
  if (shareWhatsapp !== undefined) { fields.push(`share_whatsapp = $${i++}`); values.push(shareWhatsapp); }

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

async function findAll({ offset = 0, limit = 50, search = '' } = {}) {
  const pattern = search ? `%${search}%` : null;
  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS total FROM users
     WHERE $1::text IS NULL OR name ILIKE $1 OR email ILIKE $1 OR enrollment_no ILIKE $1`,
    [pattern]
  );
  const { rows } = await pool.query(
    `SELECT id, name, email, school, department, semester, enrollment_no,
            is_admin, created_at
     FROM users
     WHERE $1::text IS NULL OR name ILIKE $1 OR email ILIKE $1 OR enrollment_no ILIKE $1
     ORDER BY id ASC LIMIT $2 OFFSET $3`,
    [pattern, limit, offset]
  );
  return { rows, total: countRows[0].total };
}

async function countAll() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM users');
  return rows[0].count;
}

// Foreign keys block deleting a user who still has related rows, so remove them first.
// Returns the sender and receiver of each deleted message.
async function deleteById(id) {
  return withTransaction(async (client) => {
    const { rows: listingRows } = await client.query('SELECT image_url FROM listings WHERE seller_id = $1', [id]);
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
    return { messages: rows, imageUrls: listingRows.map((listing) => listing.image_url).filter(Boolean) };
  });
}

module.exports = {
  findByEmail,
  findByEnrollmentNo,
  findById,
  create,
  markEmailVerified,
  resendVerification,
  requestPasswordReset,
  consumePasswordReset,
  updateProfile,
  findAll,
  countAll,
  deleteById,
};
