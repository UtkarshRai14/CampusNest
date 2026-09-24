const listingModel = require('../models/listing.model');
const mlService = require('../services/mlService');
const cloudinaryService = require('../services/cloudinary.service');
const HttpError = require('../utils/HttpError');


function verificationInfoFromSpamResult(spamResult) {
  if (!spamResult) {
    
    return {
      ai_verified: true,
      spam_score: 0.0,
      verification_label: '✅ AI Verified',
      verification_color: '#00A896',
      verification_bg: '#E8FBF8',
    };
  }

  const spamProb = spamResult.spam_probability;
  const isFlagged = spamResult.is_spam;

  if (isFlagged || spamProb > 0.6) {
    return {
      ai_verified: false,
      spam_score: spamProb,
      verification_label: '⚠️ Under Review',
      verification_color: '#CC8800',
      verification_bg: '#FFF8E8',
    };
  }
  if (spamProb < 0.15) {
    return {
      ai_verified: true,
      spam_score: spamProb,
      verification_label: '✅ AI Verified',
      verification_color: '#00A896',
      verification_bg: '#E8FBF8',
    };
  }
  return {
    ai_verified: true,
    spam_score: spamProb,
    verification_label: '🔍 Reviewed',
    verification_color: '#0080CC',
    verification_bg: '#EBF5FF',
  };
}







function toListingDict(listing, spamResult) {
  const verification = verificationInfoFromSpamResult(spamResult);
  return {
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
    seller_name: listing.seller_name || 'IIIT Sonepat Student',
    seller_school: listing.seller_school || '',
    seller_department: listing.seller_department || '',
    seller_semester: listing.seller_semester || 0,
    seller_email: listing.seller_email || '',
    created_at: listing.created_at,
    ai_verified: verification.ai_verified,
    spam_score: verification.spam_score,
    verification_label: verification.verification_label,
    verification_color: verification.verification_color,
    verification_bg: verification.verification_bg,
  };
}


async function toListingDicts(listings) {
  if (listings.length === 0) return [];
  let spamResults;
  try {
    spamResults = await mlService.isSpamBatch(
      listings.map((l) => ({ id: l.id, title: l.title || '', description: l.description || '' }))
    );
  } catch (err) {
    spamResults = null; 
  }
  const byId = new Map((spamResults || []).map((r) => [r.id, r]));
  return listings.map((l) => toListingDict(l, byId.get(l.id) || null));
}


async function createListing(req, res) {
  const {
    title, description, price, condition, category, listing_type: listingType,
    department_tag: departmentTagRaw, semester_tag: semesterTagRaw,
  } = req.body;

  if (!title || price === undefined || condition === undefined || !category || !listingType) {
    throw new HttpError(422, [{ msg: 'title, price, condition, category and listing_type are required' }]);
  }

  let imageUrl = null;
  if (req.file && req.file.buffer && req.file.buffer.length > 0) {
    try {
      imageUrl = await cloudinaryService.uploadImage(req.file.buffer);
    } catch (err) {
      
      console.error(`Image upload failed: ${err.message || err}`);
    }
  }

  const spamResult = await mlService.isSpam(title, description || '');

  const listing = await listingModel.create({
    title,
    description: description || null,
    price: parseFloat(price),
    condition: parseInt(condition, 10),
    category,
    listingType,
    departmentTag: departmentTagRaw || req.user.department,
    semesterTag: semesterTagRaw ? parseInt(semesterTagRaw, 10) : null,
    imageUrl,
    sellerId: req.user.id,
    isFlagged: spamResult.is_spam,
  });

  const [dict] = await toListingDicts([listing]);
  return res.json(dict);
}


async function getListings(req, res) {
  const {
    category, listing_type: listingType, department_tag: departmentTag, semester_tag: semesterTag,
    min_price: minPrice, max_price: maxPrice, min_condition: minCondition, search,
    skip, limit,
  } = req.query;

  const listings = await listingModel.findMany({
    category,
    listingType,
    departmentTag,
    semesterTag: semesterTag ? parseInt(semesterTag, 10) : undefined,
    minPrice: minPrice !== undefined ? parseFloat(minPrice) : undefined,
    maxPrice: maxPrice !== undefined ? parseFloat(maxPrice) : undefined,
    minCondition: minCondition !== undefined ? parseInt(minCondition, 10) : undefined,
    search,
    skip: skip !== undefined ? parseInt(skip, 10) : 0,
    limit: limit !== undefined ? parseInt(limit, 10) : 50,
  });

  return res.json(await toListingDicts(listings));
}


async function getMyListings(req, res) {
  const listings = await listingModel.findBySeller(req.user.id);
  return res.json(await toListingDicts(listings));
}


async function getListing(req, res) {
  const listing = await listingModel.findById(parseInt(req.params.id, 10));
  if (!listing) throw new HttpError(404, 'Listing not found');
  const [dict] = await toListingDicts([listing]);
  return res.json(dict);
}


async function updateListing(req, res) {
  const id = parseInt(req.params.id, 10);
  const listing = await listingModel.findByIdAny(id);
  if (!listing) throw new HttpError(404, 'Listing not found');
  if (listing.seller_id !== req.user.id) throw new HttpError(403, 'Not your listing');

  const { title, description, price, condition } = req.query;
  const updated = await listingModel.updateFields(id, {
    title,
    description,
    price: price !== undefined ? parseFloat(price) : undefined,
    condition: condition !== undefined ? parseInt(condition, 10) : undefined,
  });
  const [dict] = await toListingDicts([updated]);
  return res.json(dict);
}


async function deleteListing(req, res) {
  const id = parseInt(req.params.id, 10);
  const listing = await listingModel.findByIdAny(id);
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
  toListingDicts, 
};
