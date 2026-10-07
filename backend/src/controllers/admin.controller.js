const userModel = require('../models/user.model');
const listingModel = require('../models/listing.model');
const pool = require('../db/pool');
const realtime = require('../services/realtime.service');
const HttpError = require('../utils/HttpError');
const { parseId } = require('../utils/validators');

async function getStats(req, res) {
  const { rows } = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM users) AS total_users,
      (SELECT COUNT(*)::int FROM listings WHERE is_active = TRUE) AS total_listings,
      (SELECT COUNT(*)::int FROM listings WHERE is_active = TRUE AND listing_type = 'sell') AS sell_listings,
      (SELECT COUNT(*)::int FROM listings WHERE is_active = TRUE AND listing_type = 'rent') AS rent_listings,
      (SELECT COUNT(*)::int FROM listings WHERE is_active = TRUE AND listing_type = 'borrow') AS borrow_listings,
      (SELECT COUNT(*)::int FROM listings WHERE is_active = TRUE AND listing_type = 'swap') AS swap_listings
  `);
  return res.json(rows[0]);
}

async function getAllUsers(req, res) {
  const users = await userModel.findAll();
  const { rows: counts } = await pool.query(
    'SELECT seller_id, COUNT(*)::int AS count FROM listings WHERE is_active = TRUE GROUP BY seller_id'
  );
  const countBySeller = new Map(counts.map((c) => [c.seller_id, c.count]));

  return res.json(users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    school_name: u.school,
    department: u.department,
    semester: u.semester,
    enrollment_no: u.enrollment_no,
    is_admin: Boolean(u.is_admin),
    created_at: u.created_at,
    listings_count: countBySeller.get(u.id) || 0,
  })));
}

async function getAllListings(req, res) {
  const listings = await listingModel.findAllActive();
  return res.json(listings.map((l) => ({
    id: l.id,
    title: l.title,
    category: l.category,
    listing_type: l.listing_type,
    price: l.price,
    condition: l.condition,
    seller_id: l.seller_id,
    created_at: l.created_at,
  })));
}

async function deleteListing(req, res) {
  const id = parseId(req.params.id, 'Listing id');
  const listing = await listingModel.findByIdAny(id);
  if (!listing) throw new HttpError(404, 'Listing not found');
  const deletedMessages = await listingModel.hardDelete(id);
  await realtime.notifyMessagesDeleted(deletedMessages);
  return res.json({ message: 'Listing deleted' });
}

async function deleteUser(req, res) {
  const id = parseId(req.params.id, 'User id');
  if (id === req.user.id) throw new HttpError(400, 'You cannot delete your own account');
  const user = await userModel.findById(id);
  if (!user) throw new HttpError(404, 'User not found');
  const deletedMessages = await userModel.deleteById(id);
  await realtime.notifyMessagesDeleted(deletedMessages);
  return res.json({ message: 'User deleted' });
}

module.exports = { getStats, getAllUsers, getAllListings, deleteListing, deleteUser };
