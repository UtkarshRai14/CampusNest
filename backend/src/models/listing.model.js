const pool = require('../db/pool');





const SELECT_WITH_SELLER = `
  SELECT
    l.*,
    u.name AS seller_name,
    u.school AS seller_school,
    u.department AS seller_department,
    u.semester AS seller_semester,
    u.email AS seller_email,
    u.whatsapp AS seller_whatsapp
  FROM listings l
  LEFT JOIN users u ON u.id = l.seller_id
`;

async function create({
  title, description, price, condition, category, listingType,
  departmentTag, semesterTag, imageUrl, sellerId, isFlagged,
}) {
  const { rows } = await pool.query(
    `INSERT INTO listings
      (title, description, price, condition, category, listing_type,
       department_tag, semester_tag, image_url, seller_id, is_active, is_flagged)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,TRUE,$11)
     RETURNING id`,
    [title, description || null, price, condition, category, listingType,
      departmentTag || null, semesterTag || null, imageUrl || null, sellerId, isFlagged]
  );
  return findByIdAny(rows[0].id);
}


async function findById(id) {
  const { rows } = await pool.query(`${SELECT_WITH_SELLER} WHERE l.id = $1 AND l.is_active = TRUE`, [id]);
  return rows[0] || null;
}


async function findByIdAny(id) {
  const { rows } = await pool.query(`${SELECT_WITH_SELLER} WHERE l.id = $1`, [id]);
  return rows[0] || null;
}

async function findBySeller(sellerId) {
  const { rows } = await pool.query(
    `${SELECT_WITH_SELLER} WHERE l.seller_id = $1 ORDER BY l.created_at DESC`,
    [sellerId]
  );
  return rows;
}







async function findMany(filters) {
  const {
    category, listingType, departmentTag, semesterTag,
    minPrice, maxPrice, minCondition, search,
    skip = 0, limit = 50,
  } = filters;

  const clauses = ['l.is_active = TRUE'];
  const values = [];
  let i = 1;

  if (category) { clauses.push(`l.category = $${i++}`); values.push(category); }
  if (listingType) { clauses.push(`l.listing_type = $${i++}`); values.push(listingType); }
  if (departmentTag) { clauses.push(`l.department_tag = $${i++}`); values.push(departmentTag); }
  if (semesterTag) { clauses.push(`l.semester_tag = $${i++}`); values.push(semesterTag); }
  if (minPrice !== undefined && minPrice !== null) { clauses.push(`l.price >= $${i++}`); values.push(minPrice); }
  if (maxPrice !== undefined && maxPrice !== null) { clauses.push(`l.price <= $${i++}`); values.push(maxPrice); }
  if (minCondition !== undefined && minCondition !== null) { clauses.push(`l.condition >= $${i++}`); values.push(minCondition); }
  if (search) {
    clauses.push(`(l.title ILIKE $${i} OR l.description ILIKE $${i} OR l.category ILIKE $${i})`);
    values.push(`%${search}%`);
    i += 1;
  }

  values.push(limit);
  const limitIdx = i++;
  values.push(skip);
  const offsetIdx = i++;

  const { rows } = await pool.query(
    `${SELECT_WITH_SELLER}
     WHERE ${clauses.join(' AND ')}
     ORDER BY l.created_at DESC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    values
  );
  return rows;
}


async function updateFields(id, { title, description, price, condition }) {
  const fields = [];
  const values = [];
  let i = 1;

  if (title) { fields.push(`title = $${i++}`); values.push(title); }
  if (description) { fields.push(`description = $${i++}`); values.push(description); }
  if (price) { fields.push(`price = $${i++}`); values.push(price); }
  if (condition) { fields.push(`condition = $${i++}`); values.push(condition); }

  if (fields.length === 0) return findByIdAny(id);

  values.push(id);
  await pool.query(`UPDATE listings SET ${fields.join(', ')} WHERE id = $${i}`, values);
  return findByIdAny(id);
}

async function softDelete(id) {
  await pool.query('UPDATE listings SET is_active = FALSE WHERE id = $1', [id]);
}

async function hardDelete(id) {
  await pool.query('DELETE FROM listings WHERE id = $1', [id]);
}

async function findAllForAdmin() {
  const { rows } = await pool.query(`${SELECT_WITH_SELLER} ORDER BY l.created_at DESC`);
  return rows;
}

async function countAll() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM listings WHERE is_active = TRUE');
  return rows[0].count;
}

async function countDistinctCategories() {
  const { rows } = await pool.query(
    'SELECT COUNT(DISTINCT category)::int AS count FROM listings WHERE is_active = TRUE'
  );
  return rows[0].count;
}

async function averagePrice() {
  const { rows } = await pool.query(
    'SELECT COALESCE(AVG(price), 0) AS avg FROM listings WHERE is_active = TRUE'
  );
  return parseFloat(rows[0].avg);
}







async function countByCategory() {
  const { rows } = await pool.query(
    `SELECT category, COUNT(*)::int AS count
     FROM listings WHERE is_active = TRUE AND is_flagged = FALSE
     GROUP BY category ORDER BY count DESC`
  );
  return rows;
}


async function countByDepartment() {
  const { rows } = await pool.query(
    `SELECT department_tag, COUNT(*)::int AS count
     FROM listings WHERE is_active = TRUE AND department_tag IS NOT NULL
     GROUP BY department_tag ORDER BY count DESC LIMIT 8`
  );
  return rows;
}

async function countFlagged() {
  const { rows } = await pool.query(
    'SELECT COUNT(*)::int AS count FROM listings WHERE is_flagged = TRUE'
  );
  return rows[0].count;
}


async function findAllActive() {
  const { rows } = await pool.query(
    `${SELECT_WITH_SELLER} WHERE l.is_active = TRUE ORDER BY l.created_at DESC`
  );
  return rows;
}

module.exports = {
  create,
  findById,
  findByIdAny,
  findBySeller,
  findMany,
  updateFields,
  softDelete,
  hardDelete,
  findAllForAdmin,
  countAll,
  countDistinctCategories,
  averagePrice,
  countByCategory,
  countByDepartment,
  countFlagged,
  findAllActive,
};
