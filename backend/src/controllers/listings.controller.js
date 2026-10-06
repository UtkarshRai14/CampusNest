const listingModel = require('../models/listing.model');
const mlService = require('../services/mlService');
const cloudinaryService = require('../services/cloudinary.service');
const HttpError = require('../utils/HttpError');
const {
  isMissing, parseText, parseOptionalText, parseNumber, parseId,
  parseSemester, parseCondition, parseListingType, parseCategory,
} = require('../utils/validators');

const SPAM_HIGH_RISK = 0.6;
const SPAM_LOW_RISK = 0.15;
const MAX_PRICE = 10000000;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function verificationInfoFromSpamResult(spamResult) {
  if (!spamResult) {
    return {
      spam_checked: false,
      spam_score: null,
      verification_label: '❔ Spam check unavailable',
      verification_color: '#7A9BA8',
      verification_bg: '#F0F4F5',
    };
  }

  const spamProb = spamResult.spam_probability;

  if (spamResult.is_spam || spamProb > SPAM_HIGH_RISK) {
    return {
      spam_checked: true,
      spam_score: spamProb,
      verification_label: '⚠️ Flagged by spam check',
      verification_color: '#CC8800',
      verification_bg: '#FFF8E8',
    };
  }
  if (spamProb < SPAM_LOW_RISK) {
    return {
      spam_checked: true,
      spam_score: spamProb,
      verification_label: '✅ Spam check passed',
      verification_color: '#00A896',
      verification_bg: '#E8FBF8',
    };
  }
  return {
    spam_checked: true,
    spam_score: spamProb,
    verification_label: '🔍 Spam check: borderline',
    verification_color: '#0080CC',
    verification_bg: '#EBF5FF',
  };
}

// Seller contact details are only included for logged-in users.
function toListingDict(listing, spamResult, includeContact) {
  const verification = verificationInfoFromSpamResult(spamResult);
  const dict = {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    price: listing.price,
    condition: listing.condition,
    category: listing.category,
    listing_type: listing.listing_type,
    department_tag: listing.department_tag,
    semester_tag: listing.semester_tag,
    image_url: listing.image_url,
    is_active: listing.is_active,
    is_flagged: listing.is_flagged,
    seller_id: listing.seller_id,
    seller_name: listing.seller_name || 'Student',
    seller_school: listing.seller_school || '',
    seller_department: listing.seller_department || '',
    seller_semester: listing.seller_semester || 0,
    created_at: listing.created_at,
    spam_checked: verification.spam_checked,
    spam_score: verification.spam_score,
    verification_label: verification.verification_label,
    verification_color: verification.verification_color,
    verification_bg: verification.verification_bg,
  };
  if (includeContact) {
    dict.seller_email = listing.seller_email || '';
    dict.seller_whatsapp = listing.seller_whatsapp || null;
  }
  return dict;
}

async function toListingDicts(listings, includeContact) {
  if (listings.length === 0) return [];
  let spamResults = [];
  try {
    spamResults = await mlService.isSpamBatch(
      listings.map((l) => ({ id: l.id, title: l.title || '', description: l.description || '' }))
    );
  } catch (err) {
    console.error(`Spam check unavailable: ${err.message}`);
  }
  const byId = new Map(spamResults.map((r) => [r.id, r]));
  return listings.map((l) => toListingDict(l, byId.get(l.id) || null, includeContact));
}

async function checkSpam(title, description) {
  try {
    return await mlService.isSpam(title, description || '');
  } catch (err) {
    console.error(`Spam check unavailable: ${err.message}`);
    return null;
  }
}

async function createListing(req, res) {
  const body = req.body || {};

  const title = parseText(body.title, 'Title', { max: 120 });
  const description = parseOptionalText(body.description, 'Description', { max: 2000 });
  const price = parseNumber(body.price, 'Price', { positive: true, max: MAX_PRICE });
  const condition = parseCondition(body.condition);
  const category = parseCategory(body.category);
  const listingType = parseListingType(body.listing_type);
  const departmentTag = parseOptionalText(body.department_tag, 'Department tag', { max: 150 }) || req.user.department;
  const semesterTag = isMissing(body.semester_tag)
    ? req.user.semester
    : parseSemester(body.semester_tag, 'Semester tag');

  let imageUrl = null;
  if (req.file && req.file.buffer.length > 0) {
    try {
      imageUrl = await cloudinaryService.uploadImage(req.file.buffer);
    } catch (err) {
      console.error(`Image upload failed: ${err.message || err}`);
      throw new HttpError(502, 'Image upload failed. Please try again or post without a photo.');
    }
  }

  const spamResult = await checkSpam(title, description);

  const listing = await listingModel.create({
    title,
    description,
    price,
    condition,
    category,
    listingType,
    departmentTag,
    semesterTag,
    imageUrl,
    sellerId: req.user.id,
    isFlagged: spamResult ? spamResult.is_spam : false,
  });

  return res.json(toListingDict(listing, spamResult, true));
}

async function getListings(req, res) {
  const q = req.query;

  const listings = await listingModel.findMany({
    category: isMissing(q.category) ? undefined : parseText(q.category, 'Category', { max: 100 }),
    listingType: isMissing(q.listing_type) ? undefined : parseText(q.listing_type, 'Listing type', { max: 20 }),
    departmentTag: isMissing(q.department_tag) ? undefined : parseText(q.department_tag, 'Department tag', { max: 150 }),
    semesterTag: isMissing(q.semester_tag) ? undefined : parseSemester(q.semester_tag, 'Semester tag'),
    minPrice: isMissing(q.min_price) ? undefined : parseNumber(q.min_price, 'Minimum price', { min: 0 }),
    maxPrice: isMissing(q.max_price) ? undefined : parseNumber(q.max_price, 'Maximum price', { min: 0 }),
    minCondition: isMissing(q.min_condition) ? undefined : parseCondition(q.min_condition),
    search: isMissing(q.search) ? undefined : parseText(q.search, 'Search', { max: 100 }),
    skip: isMissing(q.skip) ? 0 : parseNumber(q.skip, 'Skip', { integer: true, min: 0 }),
    limit: isMissing(q.limit) ? DEFAULT_LIMIT : parseNumber(q.limit, 'Limit', { integer: true, min: 1, max: MAX_LIMIT }),
  });

  return res.json(await toListingDicts(listings, Boolean(req.user)));
}

async function getMyListings(req, res) {
  const listings = await listingModel.findBySeller(req.user.id);
  return res.json(await toListingDicts(listings, true));
}

async function getListing(req, res) {
  const listing = await listingModel.findById(parseId(req.params.id, 'Listing id'));
  if (!listing) throw new HttpError(404, 'Listing not found');
  const [dict] = await toListingDicts([listing], Boolean(req.user));
  return res.json(dict);
}

async function updateListing(req, res) {
  const id = parseId(req.params.id, 'Listing id');
  const listing = await listingModel.findById(id);
  if (!listing) throw new HttpError(404, 'Listing not found');
  if (listing.seller_id !== req.user.id) throw new HttpError(403, 'Not your listing');

  const body = req.body || {};
  const updates = {};
  if (body.title !== undefined) updates.title = parseText(body.title, 'Title', { max: 120 });
  if (body.description !== undefined) updates.description = parseOptionalText(body.description, 'Description', { max: 2000 });
  if (body.price !== undefined) updates.price = parseNumber(body.price, 'Price', { positive: true, max: MAX_PRICE });
  if (body.condition !== undefined) updates.condition = parseCondition(body.condition);
  if (Object.keys(updates).length === 0) throw new HttpError(400, 'No changes provided');

  // Editing the text re-runs the spam check so an edit cannot bypass it.
  const textChanged = updates.title !== undefined || updates.description !== undefined;
  let spamResult = null;
  if (textChanged) {
    const title = updates.title !== undefined ? updates.title : listing.title;
    const description = updates.description !== undefined ? updates.description : listing.description;
    spamResult = await checkSpam(title, description);
    if (spamResult) updates.isFlagged = spamResult.is_spam;
  }

  const updated = await listingModel.updateFields(id, updates);
  const dict = textChanged
    ? toListingDict(updated, spamResult, true)
    : (await toListingDicts([updated], true))[0];
  return res.json(dict);
}

async function deleteListing(req, res) {
  const id = parseId(req.params.id, 'Listing id');
  const listing = await listingModel.findById(id);
  if (!listing) throw new HttpError(404, 'Listing not found');
  if (listing.seller_id !== req.user.id) throw new HttpError(403, 'Not your listing');

  await listingModel.softDelete(id);
  return res.json({ message: 'Listing removed successfully' });
}

module.exports = {
  createListing,
  getListings,
  getMyListings,
  getListing,
  updateListing,
  deleteListing,
};
