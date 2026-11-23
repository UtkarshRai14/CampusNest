const userModel = require('../models/user.model');
const listingModel = require('../models/listing.model');
const pool = require('../db/pool');
const realtime = require('../services/realtime.service');
const cloudinaryService = require('../services/cloudinary.service');
const HttpError = require('../utils/HttpError');
const { parseId, parseText } = require('../utils/validators');

async function getStats(req, res) {
  const { rows } = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM users) AS total_users,
      (SELECT COUNT(*)::int FROM listings WHERE is_active = TRUE AND availability_status = 'available') AS total_listings,
      (SELECT COUNT(*)::int FROM listings WHERE is_active = TRUE AND availability_status = 'available' AND listing_type = 'sell') AS sell_listings,
      (SELECT COUNT(*)::int FROM listings WHERE is_active = TRUE AND availability_status = 'available' AND listing_type = 'rent') AS rent_listings,
      (SELECT COUNT(*)::int FROM listings WHERE is_active = TRUE AND availability_status = 'available' AND listing_type = 'borrow') AS borrow_listings,
      (SELECT COUNT(*)::int FROM listings WHERE is_active = TRUE AND availability_status = 'available' AND listing_type = 'swap') AS swap_listings
  `);
  return res.json(rows[0]);
}

function getPage(req) {
  const limit = req.query.limit === undefined ? 50 : parseId(req.query.limit, 'Limit');
  const page = req.query.page === undefined ? 1 : parseId(req.query.page, 'Page');
  if (limit > 100) throw new HttpError(400, 'Limit must be at most 100');
  if (page > 1000000) throw new HttpError(400, 'Page is too large');
  return { limit, offset: (page - 1) * limit };
}

function setPageHeaders(res, total, { limit, offset }) {
  res.set('X-Total-Count', String(total));
  res.set('X-Page-Limit', String(limit));
  res.set('X-Page-Offset', String(offset));
  res.set('Access-Control-Expose-Headers', 'X-Total-Count, X-Page-Limit, X-Page-Offset');
}

async function getAllUsers(req, res) {
  const page = getPage(req);
  const search = req.query.search === undefined ? '' : parseText(req.query.search, 'Search', { max: 100 });
  const { rows: users, total } = await userModel.findAll({ ...page, search });
  const userIds = users.map((user) => user.id);
  const { rows: counts } = await pool.query(
    `SELECT seller_id, COUNT(*)::int AS count FROM listings
     WHERE is_active = TRUE AND availability_status = 'available' AND seller_id = ANY($1::int[])
     GROUP BY seller_id`,
    [userIds]
  );
  const countBySeller = new Map(counts.map((c) => [c.seller_id, c.count]));

  setPageHeaders(res, total, page);
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
  const page = getPage(req);
  const search = req.query.search === undefined ? '' : parseText(req.query.search, 'Search', { max: 100 });
  const { rows: listings, total } = await listingModel.findAllActiveForAdmin({ ...page, search });
  setPageHeaders(res, total, page);
  return res.json(listings.map((l) => ({
    id: l.id,
    title: l.title,
    category: l.category,
    listing_type: l.listing_type,
    price: l.price,
    condition: l.condition,
    availability_status: l.availability_status || 'available',
    seller_id: l.seller_id,
    created_at: l.created_at,
  })));
}

async function deleteListing(req, res) {
  const id = parseId(req.params.id, 'Listing id');
  const listing = await listingModel.findByIdAny(id);
  if (!listing) throw new HttpError(404, 'Listing not found');
  const deletion = await listingModel.hardDelete(id);
  if (!deletion) throw new HttpError(404, 'Listing not found');
  await realtime.notifyMessagesDeleted(deletion.messages);
  let imageCleanup = 'complete';
  try {
    const cleaned = await cloudinaryService.deleteListingImage(deletion.imageUrl);
    if (!cleaned) imageCleanup = 'pending';
  } catch {
    imageCleanup = 'pending';
  }
  if (imageCleanup === 'pending') console.error('[cloudinary] Listing image cleanup failed; manual cleanup is required.');
  return res.json({
    message: imageCleanup === 'complete' ? 'Listing deleted' : 'Listing deleted; image cleanup could not be completed.',
    image_cleanup: imageCleanup,
  });
}

async function deleteUser(req, res) {
  const id = parseId(req.params.id, 'User id');
  if (id === req.user.id) throw new HttpError(400, 'You cannot delete your own account');
  const user = await userModel.findById(id);
  if (!user) throw new HttpError(404, 'User not found');
  const deletion = await userModel.deleteById(id);
  await realtime.notifyMessagesDeleted(deletion.messages);
  const cleanupResults = await Promise.allSettled(deletion.imageUrls.map((url) => cloudinaryService.deleteListingImage(url)));
  const cleanupFailed = cleanupResults.some((result) => result.status === 'rejected' || result.value !== true);
  if (cleanupFailed) console.error('[cloudinary] User listing image cleanup failed; manual cleanup is required.');
  return res.json({
    message: cleanupFailed ? 'User deleted; some listing image cleanup could not be completed.' : 'User deleted',
    image_cleanup: cleanupFailed ? 'pending' : 'complete',
  });
}

module.exports = { getStats, getAllUsers, getAllListings, deleteListing, deleteUser };
