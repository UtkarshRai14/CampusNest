


















const pool = require('../db/pool');

async function queryActiveListings({ excludeSellerId, departmentTag, semesterTag, limit }) {
  const clauses = ['is_active = TRUE', 'is_flagged = FALSE', 'seller_id != $1'];
  const values = [excludeSellerId];
  let i = 2;

  if (departmentTag !== undefined) {
    clauses.push(`department_tag = $${i++}`);
    values.push(departmentTag);
  }
  if (semesterTag !== undefined) {
    clauses.push(`semester_tag = $${i++}`);
    values.push(semesterTag);
  }

  values.push(limit);
  const { rows } = await pool.query(
    `SELECT * FROM listings WHERE ${clauses.join(' AND ')} ORDER BY created_at DESC LIMIT $${i}`,
    values
  );
  return rows;
}

function toRecommendationShape(listing, relevanceScore) {
  return {
    id: listing.id,
    title: listing.title,
    price: listing.price,
    condition: listing.condition,
    category: listing.category,
    listing_type: listing.listing_type,
    department_tag: listing.department_tag,
    semester_tag: listing.semester_tag,
    image_url: listing.image_url,
    relevance_score: relevanceScore,
  };
}

async function getPopularListings(limit = 6) {
  const { rows } = await pool.query(
    `SELECT * FROM listings WHERE is_active = TRUE AND is_flagged = FALSE
     ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return rows.map((l) => toRecommendationShape(l, 1));
}

async function getRecommendations(userId, limit = 6) {
  const { rows: userRows } = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
  const currentUser = userRows[0];
  if (!currentUser) {
    return getPopularListings(limit);
  }

  const sameDeptListings = await queryActiveListings({
    excludeSellerId: userId,
    departmentTag: currentUser.department,
    limit: limit * 2,
  });
  const sameSemListings = await queryActiveListings({
    excludeSellerId: userId,
    semesterTag: currentUser.semester,
    limit: limit * 2,
  });
  const allListings = await queryActiveListings({
    excludeSellerId: userId,
    limit: limit * 2,
  });

  const scored = new Map(); 
  const byId = new Map();

  const addScore = (listing, points) => {
    byId.set(listing.id, listing);
    scored.set(listing.id, (scored.get(listing.id) || 0) + points);
  };

  sameDeptListings.forEach((l) => addScore(l, 3));
  sameSemListings.forEach((l) => addScore(l, 2));
  allListings.forEach((l) => addScore(l, 1));

  const sortedIds = Array.from(scored.keys())
    .map((id, index) => ({ id, index, score: scored.get(id) }))
    
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((entry) => entry.id);

  const result = [];
  for (const lid of sortedIds) {
    const listing = byId.get(lid);
    if (listing) {
      result.push(toRecommendationShape(listing, scored.get(lid)));
    }
  }

  if (result.length < limit) {
    const popular = await getPopularListings(limit - result.length);
    const existingIds = result.map((r) => r.id);
    for (const p of popular) {
      if (!existingIds.includes(p.id)) {
        result.push(p);
      }
    }
  }

  return result.slice(0, limit);
}

module.exports = { getRecommendations, getPopularListings };
