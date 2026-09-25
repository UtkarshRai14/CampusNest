const userModel = require('../models/user.model');
const listingModel = require('../models/listing.model');
const pool = require('../db/pool');
const HttpError = require('../utils/HttpError');


async function getStats(req, res) {
  const { rows } = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM users) AS total_users,
      (SELECT COUNT(*)::int FROM listings) AS total_listings,
      (SELECT COUNT(*)::int FROM listings WHERE listing_type = 'sell') AS sell_listings,
      (SELECT COUNT(*)::int FROM listings WHERE listing_type = 'rent') AS rent_listings,
      (SELECT COUNT(*)::int FROM listings WHERE listing_type = 'borrow') AS borrow_listings,
      (SELECT COUNT(*)::int FROM listings WHERE listing_type = 'swap') AS swap_listings,
      (SELECT COUNT(*)::int FROM listings WHERE is_flagged = TRUE) AS spam_flagged
  `);
  const r = rows[0];
  return res.json({
    total_users: r.total_users,
    total_listings: r.total_listings,
    sell_listings: r.sell_listings,
    rent_listings: r.rent_listings,
    borrow_listings: r.borrow_listings,
    swap_listings: r.swap_listings,
    spam_flagged: r.spam_flagged,
  });
}








async function getAllUsers(req, res) {
  const users = await userModel.findAll();
  const { rows: counts } = await pool.query(
    'SELECT seller_id, COUNT(*)::int AS count FROM listings GROUP BY seller_id'
  );
  const countBySeller = new Map(counts.map((c) => [c.seller_id, c.count]));

  return res.json(users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    school: u.school,
    school_name: u.school,
    department: u.department,
    semester: u.semester,
    phone: u.phone,
    enrollment_no: u.enrollment_no,
    created_at: u.created_at,
    listings_count: countBySeller.get(u.id) || 0,
  })));
}







async function getAllListings(req, res) {
  const listings = await listingModel.findAllForAdmin();
  return res.json(listings.map((l) => ({
    id: l.id,
    title: l.title,
    category: l.category,
    listing_type: l.listing_type,
    price: l.price,
    condition: l.condition,
    is_flagged: l.is_flagged,
    is_spam: l.is_flagged,
    seller_id: l.seller_id,
    created_at: l.created_at,
  })));
}


async function deleteListing(req, res) {
  const id = parseInt(req.params.id, 10);
  const listing = await listingModel.findByIdAny(id);
  if (!listing) throw new HttpError(404, 'Not found');
  await listingModel.hardDelete(id);
  return res.json({ message: 'Deleted' });
}


async function deleteUser(req, res) {
  const id = parseInt(req.params.id, 10);
  const user = await userModel.findById(id);
  if (!user) throw new HttpError(404, 'Not found');
  await userModel.deleteById(id);
  return res.json({ message: 'Deleted' });
}

module.exports = { getStats, getAllUsers, getAllListings, deleteListing, deleteUser };
