const crypto = require('crypto');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

function createLimiter({ windowMs, limit, message, keyType = 'ip' }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req) => {
      if (keyType === 'user') return `user:${req.user.id}`;
      if (keyType === 'email') {
        const email = String(req.body?.email || '').trim().toLowerCase();
        if (email) return `email:${crypto.createHash('sha256').update(email).digest('hex')}`;
      }
      return ipKeyGenerator(req.ip || req.socket.remoteAddress || '127.0.0.1');
    },
    handler: (req, res) => res.status(429).json({ detail: message }),
  });
}

const api = createLimiter({ windowMs: 5 * 60 * 1000, limit: 300, message: 'Too many requests. Please try again shortly.' });
const authIp = createLimiter({ windowMs: 15 * 60 * 1000, limit: 20, message: 'Too many authentication attempts. Please try again later.' });
const resendEmail = createLimiter({ windowMs: 60 * 60 * 1000, limit: 3, keyType: 'email', message: 'Too many verification requests. Please try again later.' });
const guestAi = createLimiter({ windowMs: 15 * 60 * 1000, limit: 10, message: 'ARIA is receiving too many requests from this network. Please try again later.' });
const aiIp = createLimiter({ windowMs: 15 * 60 * 1000, limit: 30, message: 'ARIA is receiving too many requests. Please try again later.' });
const aiUser = createLimiter({ windowMs: 15 * 60 * 1000, limit: 20, keyType: 'user', message: 'You have reached the ARIA request limit. Please try again later.' });
const listingIp = createLimiter({ windowMs: 15 * 60 * 1000, limit: 40, message: 'Too many listing operations. Please try again later.' });
const listingUser = createLimiter({ windowMs: 60 * 60 * 1000, limit: 20, keyType: 'user', message: 'You have reached the listing creation limit. Please try again later.' });
const messageIp = createLimiter({ windowMs: 15 * 60 * 1000, limit: 120, message: 'Too many messages. Please try again later.' });
const messageUser = createLimiter({ windowMs: 15 * 60 * 1000, limit: 60, keyType: 'user', message: 'You have reached the message limit. Please try again later.' });

module.exports = { createLimiter, api, authIp, resendEmail, guestAi, aiIp, aiUser, listingIp, listingUser, messageIp, messageUser };
