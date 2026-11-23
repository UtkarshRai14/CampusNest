const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const userModel = require('../models/user.model');

const BCRYPT_ROUNDS = 12;

async function hashPassword(password) {
  if (Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('Password exceeds bcrypt’s 72-byte limit');
  }
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function verifyPassword(plain, hashed) {
  try {
    // Existing hashes made before the byte limit was enforced remain verifiable.
    // New registrations and resets reject longer passwords before hashing.
    return await bcrypt.compare(plain, hashed);
  } catch (err) {
    return false;
  }
}

function createAccessToken(data) {
  return jwt.sign(data, env.jwtSecret, {
    algorithm: env.jwtAlgorithm,
    expiresIn: `${env.accessTokenExpireMinutes}m`,
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
  if (!payload || typeof payload.sub !== 'string' || !/^\d+$/.test(payload.sub)) return null;
  const userId = Number(payload.sub);
  if (!Number.isSafeInteger(userId) || userId < 1) return null;
  const user = await userModel.findById(userId);
  if (!user || Number(payload.ver || 0) !== Number(user.token_version || 0)) return null;
  return user;
}

module.exports = {
  hashPassword,
  verifyPassword,
  createAccessToken,
  decodeToken,
  getUserFromToken,
};
