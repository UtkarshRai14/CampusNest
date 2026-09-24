const pool = require('../db/pool');

async function findByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
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
    [name, email, password, phone || null, department, school, semester, enrollmentNo || null]
  );
  return rows[0];
}










async function updateProfile(id, { name, phone, semester, whatsapp }) {
  const fields = [];
  const values = [];
  let i = 1;

  if (name) { fields.push(`name = $${i++}`); values.push(name); }
  if (phone) { fields.push(`phone = $${i++}`); values.push(phone); }
  if (semester) { fields.push(`semester = $${i++}`); values.push(semester); }
  if (whatsapp) { fields.push(`whatsapp = $${i++}`); values.push(whatsapp); }

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

async function deleteById(id) {
  await pool.query('DELETE FROM users WHERE id = $1', [id]);
}


function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    department: user.department,
    school: user.school,
    semester: user.semester,
    created_at: user.created_at,
  };
}

module.exports = {
  findByEmail,
  findById,
  create,
  updateProfile,
  findAll,
  countAll,
  deleteById,
  toPublicUser,
};
