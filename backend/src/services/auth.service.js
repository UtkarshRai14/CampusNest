const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const userModel = require('../models/user.model');

const BCRYPT_ROUNDS = 12;

// bcrypt only uses the first 72 bytes of a password. Longer passwords are cut at a
// UTF-8 character boundary, the same way for hashing and verifying.
function truncateToBcryptLimit(password) {
  const buf = Buffer.from(password, 'utf-8');
  if (buf.length <= 72) return password;

  let end = 72;
  while (end > 0) {
    const slice = buf.subarray(0, end);
    const decoded = slice.toString('utf-8');
    // A cut inside a multi-byte character decodes to a different byte length.
    if (Buffer.byteLength(decoded, 'utf-8') === slice.length) {
      return decoded;
    }
    end -= 1;
  }
  return '';
}

function hashPassword(password) {
  const truncated = truncateToBcryptLimit(password);
  return bcrypt.hashSync(truncated, BCRYPT_ROUNDS);
}

function verifyPassword(plain, hashed) {
  try {
    const truncated = truncateToBcryptLimit(plain);
    return bcrypt.compareSync(truncated, hashed);
  } catch (err) {
    return false;
  }
}

function createAccessToken(data) {
  return jwt.sign(data, env.jwtSecret, {
    algorithm: env.jwtAlgorithm,
    expiresIn: `${env.accessTokenExpireMinutes}m`,
    noTimestamp: true,
  });
}

function decodeToken(token) {
  try {
    return jwt.verify(token, env.jwtSecret, { algorithms: [env.jwtAlgorithm] });
  } catch (err) {
    return null;
  }
}

// Returns the user a valid token belongs to, otherwise null.
async function getUserFromToken(token) {
  const payload = decodeToken(token);
  const userId = payload ? parseInt(payload.sub, 10) : NaN;
  if (Number.isNaN(userId)) return null;

  return userModel.findById(userId);
}

module.exports = {
  hashPassword,
  verifyPassword,
  createAccessToken,
  decodeToken,
  getUserFromToken,
};
