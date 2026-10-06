const HttpError = require('./HttpError');
const { CATEGORIES, LISTING_TYPES, MAX_SEMESTER, COLLEGE_EMAIL_DOMAIN } = require('../config/constants');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LISTING_TYPE_IDS = LISTING_TYPES.map((t) => t.id);
const CATEGORY_NAMES = CATEGORIES.map((c) => c.name);

function badRequest(message) {
  return new HttpError(400, message);
}

function isMissing(value) {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}

function parseText(value, label, { min = 1, max = 255 } = {}) {
  if (typeof value !== 'string') throw badRequest(`${label} is required`);
  const text = value.trim();
  if (text.length < min) {
    throw badRequest(min <= 1 ? `${label} is required` : `${label} must be at least ${min} characters`);
  }
  if (text.length > max) throw badRequest(`${label} must be at most ${max} characters`);
  return text;
}

function parseOptionalText(value, label, { max = 255 } = {}) {
  return isMissing(value) ? null : parseText(value, label, { max });
}

function parseNumber(value, label, { min, max, integer = false, positive = false } = {}) {
  if (isMissing(value) || (typeof value !== 'number' && typeof value !== 'string')) {
    throw badRequest(`${label} is required`);
  }
  const number = Number(value);
  if (!Number.isFinite(number)) throw badRequest(`${label} must be a number`);
  if (integer && !Number.isInteger(number)) throw badRequest(`${label} must be a whole number`);
  if (positive && number <= 0) throw badRequest(`${label} must be greater than 0`);
  if (min !== undefined && number < min) throw badRequest(`${label} must be at least ${min}`);
  if (max !== undefined && number > max) throw badRequest(`${label} must be at most ${max}`);
  return number;
}

function parseId(value, label = 'id') {
  return parseNumber(value, label, { integer: true, positive: true });
}

function parseEmail(value) {
  const email = parseText(value, 'Email', { max: 254 }).toLowerCase();
  if (!EMAIL_PATTERN.test(email)) throw badRequest('Enter a valid email address');
  return email;
}

function parseCollegeEmail(value) {
  const email = parseEmail(value);
  if (!email.endsWith(`@${COLLEGE_EMAIL_DOMAIN}`)) {
    throw badRequest('Use your college email');
  }
  return email;
}

// Passwords are never trimmed: the exact characters typed must match at login.
function parsePassword(value, { min, max }) {
  if (typeof value !== 'string' || value === '') throw badRequest('Password is required');
  if (value.length < min) throw badRequest(`Password must be at least ${min} characters`);
  if (value.length > max) throw badRequest(`Password must be at most ${max} characters`);
  return value;
}

function parseSemester(value, label = 'Semester') {
  return parseNumber(value, label, { integer: true, min: 1, max: MAX_SEMESTER });
}

function parseCondition(value) {
  return parseNumber(value, 'Condition', { integer: true, min: 1, max: 5 });
}

function parseMobile(value, label) {
  const digits = String(value).replace(/\D/g, '');
  let local = digits;
  if (digits.length === 12 && digits.startsWith('91')) local = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) local = digits.slice(1);
  if (!/^\d{10}$/.test(local)) throw badRequest(`${label} must be a valid 10-digit mobile number`);
  return local;
}

function parseListingType(value) {
  if (!LISTING_TYPE_IDS.includes(value)) {
    throw badRequest(`Listing type must be one of: ${LISTING_TYPE_IDS.join(', ')}`);
  }
  return value;
}

function parseCategory(value) {
  if (!CATEGORY_NAMES.includes(value)) throw badRequest('Invalid category');
  return value;
}

module.exports = {
  isMissing,
  parseText,
  parseOptionalText,
  parseNumber,
  parseId,
  parseCollegeEmail,
  parsePassword,
  parseSemester,
  parseCondition,
  parseMobile,
  parseListingType,
  parseCategory,
};
