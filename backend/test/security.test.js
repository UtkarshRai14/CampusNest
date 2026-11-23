process.env.NODE_ENV = 'test';
process.env.SECRET_KEY = 'campusnest-test-secret-at-least-32-bytes-long';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const sharp = require('sharp');
const pool = require('../src/db/pool');
const authService = require('../src/services/auth.service');
const userModel = require('../src/models/user.model');
const listingModel = require('../src/models/listing.model');
const usersController = require('../src/controllers/users.controller');
const listingsController = require('../src/controllers/listings.controller');
const { parsePassword } = require('../src/utils/validators');
const HttpError = require('../src/utils/HttpError');
const { getListingSortSql } = require('../src/utils/listingSort');
const { rejectsNewBuyerEnquiry } = require('../src/utils/messageRules');
const { sanitizeAutomaticReply } = require('../src/utils/contactPrivacy');
const { createLimiter } = require('../src/middleware/rateLimit.middleware');
const { inspectImageBuffer, MAX_FILE_SIZE, MAX_IMAGE_PIXELS } = require('../src/middleware/upload.middleware');
const { toListingDict } = require('../src/controllers/listings.controller');

test('listing sort options are allowlisted and stable', () => {
  assert.equal(getListingSortSql('newest'), 'l.created_at DESC, l.id DESC');
  assert.equal(getListingSortSql('price_low'), 'l.price ASC, l.id ASC');
  assert.equal(getListingSortSql('price_high'), 'l.price DESC, l.id DESC');
  assert.equal(getListingSortSql('condition'), 'l.condition DESC, l.created_at DESC, l.id DESC');
  assert.equal(getListingSortSql('price_low; DROP TABLE listings'), null);
});

test('new password validation enforces minimum length and bcrypt byte maximum', () => {
  assert.throws(() => parsePassword('short', { min: 8, max: 128 }), HttpError);
  assert.throws(() => parsePassword('😀'.repeat(19), { min: 8, max: 128 }), /72 UTF-8 bytes/);
  assert.equal(parsePassword('a-valid-passphrase', { min: 8, max: 128 }), 'a-valid-passphrase');
});

test('the built-in JWT secret is rejected outside development and test', () => {
  const configPath = require.resolve('../src/config/env');
  const previousNodeEnv = process.env.NODE_ENV;
  const previousSecret = process.env.SECRET_KEY;
  process.env.NODE_ENV = 'staging';
  process.env.SECRET_KEY = 'campusnest-secret-key';
  delete require.cache[configPath];
  try {
    assert.throws(() => require(configPath), /permitted only in development and test/);
  } finally {
    process.env.NODE_ENV = previousNodeEnv;
    process.env.SECRET_KEY = previousSecret;
    delete require.cache[configPath];
    require(configPath);
  }
});

test('bcrypt hashing and comparison are asynchronous and do not truncate new passwords', async () => {
  const hash = await authService.hashPassword('long-enough-password');
  assert.equal(await authService.verifyPassword('long-enough-password', hash), true);
  assert.equal(await authService.verifyPassword('different-password', hash), false);
  await assert.rejects(authService.hashPassword('😀'.repeat(19)), /72-byte limit/);
});

test('JWT rejects tampered and expired tokens and checks token versions', async () => {
  const token = authService.createAccessToken({ sub: '7', ver: 2 });
  assert.equal(authService.decodeToken(token).ver, 2);
  assert.equal(authService.decodeToken(`${token}x`), null);
  const expired = jwt.sign({ sub: '7' }, process.env.SECRET_KEY, { algorithm: 'HS256', expiresIn: -1 });
  assert.equal(authService.decodeToken(expired), null);

  const originalQuery = pool.query;
  try {
    pool.query = async () => ({ rows: [{ id: 7, token_version: 3 }] });
    assert.equal(await authService.getUserFromToken(token), null);
    const current = authService.createAccessToken({ sub: '7', ver: 3 });
    assert.equal((await authService.getUserFromToken(current)).id, 7);
  } finally {
    pool.query = originalQuery;
  }
});

test('password reset accepts one valid token and rejects expired, invalid, and reused tokens', async () => {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  let reset = { tokenHash, expiresAt: Date.now() + 60_000 };
  let savedPasswordHash = null;
  const originalConsume = userModel.consumePasswordReset;
  userModel.consumePasswordReset = async (submittedHash, passwordHash) => {
    if (!reset || submittedHash !== reset.tokenHash || reset.expiresAt <= Date.now()) return null;
    reset = null;
    savedPasswordHash = passwordHash;
    return { id: 7 };
  };

  const response = { json(body) { this.body = body; return this; } };
  try {
    await usersController.resetPassword({ body: { token, password: 'new-valid-password' } }, response);
    assert.equal(response.body.message, 'Password reset successfully. Please log in again.');
    assert.equal(await authService.verifyPassword('new-valid-password', savedPasswordHash), true);

    await assert.rejects(
      usersController.resetPassword({ body: { token, password: 'another-valid-password' } }, response),
      (error) => error.status === 400
    );

    const expiredToken = crypto.randomBytes(32).toString('hex');
    reset = {
      tokenHash: crypto.createHash('sha256').update(expiredToken).digest('hex'),
      expiresAt: Date.now() - 1000,
    };
    await assert.rejects(
      usersController.resetPassword({ body: { token: expiredToken, password: 'another-valid-password' } }, response),
      (error) => error.status === 400
    );

    reset = null;
    await assert.rejects(
      usersController.resetPassword({ body: { token: 'not-a-reset-token', password: 'another-valid-password' } }, response),
      (error) => error.status === 400
    );
  } finally {
    userModel.consumePasswordReset = originalConsume;
  }
});

test('new enquiries require an active and available listing; established discussions can continue', () => {
  const available = { is_active: true, availability_status: 'available' };
  assert.equal(rejectsNewBuyerEnquiry({ listing: available, senderIsSeller: false, existingMessageCount: 0 }), false);
  assert.equal(rejectsNewBuyerEnquiry({ listing: { ...available, is_active: false }, senderIsSeller: false, existingMessageCount: 0 }), true);
  assert.equal(rejectsNewBuyerEnquiry({ listing: { ...available, availability_status: 'sold' }, senderIsSeller: false, existingMessageCount: 0 }), true);
  assert.equal(rejectsNewBuyerEnquiry({ listing: { ...available, is_active: false }, senderIsSeller: false, existingMessageCount: 2 }), false);
  assert.equal(rejectsNewBuyerEnquiry({ listing: { ...available, is_active: false }, senderIsSeller: true, existingMessageCount: 0 }), false);
});

test('automatic replies redact old seller contacts after consent is withdrawn', () => {
  const oldReply = 'Email: seller@example.test\n📱 WhatsApp: +91 9876543210\n(This is an automatic reply.)';
  const privateReply = sanitizeAutomaticReply(oldReply, {
    isSellerMessage: true,
    shareEmail: false,
    shareWhatsapp: false,
  });
  assert.match(privateReply, /Email: \(not shared\)/);
  assert.doesNotMatch(privateReply, /seller@example\.test|9876543210/);
  assert.equal(sanitizeAutomaticReply(oldReply, { isSellerMessage: false, shareEmail: false, shareWhatsapp: false }), oldReply);
});

test('listing responses expose contact details only for individually consented fields', () => {
  const listing = {
    id: 1, title: 'Book', price: 50, condition: 3, category: 'Books', listing_type: 'sell',
    seller_email: 'seller@iiitsonepat.ac.in', seller_whatsapp: '9876543210',
    seller_share_email: false, seller_share_whatsapp: false,
  };
  const privateResult = toListingDict(listing, true);
  assert.equal(privateResult.seller_email, '');
  assert.equal(privateResult.seller_whatsapp, null);
  const optedInResult = toListingDict({ ...listing, seller_share_email: true }, true);
  assert.equal(optedInResult.seller_email, listing.seller_email);
  assert.equal(optedInResult.seller_whatsapp, null);
});

test('listing endpoint omits another seller’s private contact details from an authenticated response', async () => {
  const originalFindById = listingModel.findById;
  listingModel.findById = async () => ({
    id: 1, title: 'Book', price: 50, condition: 3, category: 'Books', listing_type: 'sell',
    seller_id: 9, seller_email: 'seller@iiitsonepat.ac.in', seller_whatsapp: '9876543210',
    seller_share_email: false, seller_share_whatsapp: false,
  });
  const response = { json(body) { this.body = body; return this; } };
  try {
    await listingsController.getListing({ params: { id: '1' }, user: { id: 7 } }, response);
    assert.equal(response.body.seller_email, '');
    assert.equal(response.body.seller_whatsapp, null);
    assert.equal(response.body.seller_id, 9);
  } finally {
    listingModel.findById = originalFindById;
  }
});

test('image decoding accepts JPEG, PNG, and WebP and rejects unsupported or malformed files', async () => {
  for (const format of ['jpeg', 'png', 'webp']) {
    const buffer = await sharp({ create: { width: 12, height: 10, channels: 3, background: '#00a896' } })[format]().toBuffer();
    const metadata = await inspectImageBuffer(buffer);
    assert.equal(metadata.format, format);
  }

  await assert.rejects(
    inspectImageBuffer(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20"/></svg>')),
    (error) => error instanceof HttpError
  );
  await assert.rejects(inspectImageBuffer(Buffer.from('not an image')));
  const oversizedDimensions = await sharp({ create: { width: 5001, height: 1, channels: 3, background: '#000' } }).png().toBuffer();
  await assert.rejects(inspectImageBuffer(oversizedDimensions), /Image dimensions are too large/);
  assert.equal(MAX_FILE_SIZE, 10 * 1024 * 1024);
  assert.equal(MAX_IMAGE_PIXELS, 20_000_000);
});

test('verification resend keeps the prior token when delivery fails and serializes concurrent sends', async () => {
  const originalConnect = pool.connect;
  const state = {
    user: { id: 1, email: 'student@iiitsonepat.ac.in', name: 'Student', email_verified: false, email_verification_token_hash: 'old' },
    locked: false,
    waiters: [],
  };
  const releaseLock = () => {
    state.locked = false;
    state.waiters.shift()?.();
  };
  pool.connect = async () => {
    let holdsLock = false;
    return {
      async query(sql, values = []) {
        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
          if (sql !== 'BEGIN' && holdsLock) { holdsLock = false; releaseLock(); }
          return { rows: [] };
        }
        if (sql.includes('SELECT * FROM users WHERE id = $1 FOR UPDATE')) {
          while (state.locked) await new Promise(resolve => state.waiters.push(resolve));
          state.locked = true;
          holdsLock = true;
          return { rows: [{ ...state.user }] };
        }
        if (sql.includes('UPDATE users SET email_verification_token_hash')) {
          state.user.email_verification_token_hash = values[1];
          state.user.email_verification_expires_at = values[2];
          return { rows: [] };
        }
        throw new Error(`Unexpected query in resend test: ${sql}`);
      },
      release() { if (holdsLock) { holdsLock = false; releaseLock(); } },
    };
  };
  try {
    await assert.rejects(
      userModel.resendVerification(1, 'failed-hash', new Date(), async () => { throw new Error('smtp unavailable'); }),
      error => error.deliveryFailure === true
    );
    assert.equal(state.user.email_verification_token_hash, 'old');

    const delivered = [];
    await Promise.all([
      userModel.resendVerification(1, 'hash-a', new Date(), async () => { delivered.push('a'); await new Promise(resolve => setTimeout(resolve, 15)); }),
      userModel.resendVerification(1, 'hash-b', new Date(), async () => { delivered.push('b'); }),
    ]);
    assert.deepEqual(delivered, ['a', 'b']);
    assert.equal(state.user.email_verification_token_hash, 'hash-b');
  } finally {
    pool.connect = originalConnect;
  }
});

test('rate limits return 429, allow normal requests, then recover after the window', async () => {
  const limiter = createLimiter({ windowMs: 120, limit: 2, message: 'Slow down' });
  async function dispatch() {
    return new Promise((resolve, reject) => {
      const request = {
        ip: '192.0.2.17', method: 'GET', path: '/limited', originalUrl: '/limited',
        headers: {}, socket: { remoteAddress: '192.0.2.17' },
        app: { get: () => false },
      };
      const responseHeaders = new Map();
      const response = {
        statusCode: 200,
        getHeader: name => responseHeaders.get(name.toLowerCase()),
        setHeader: (name, value) => responseHeaders.set(name.toLowerCase(), value),
        append(name, value) {
          const current = this.getHeader(name);
          this.setHeader(name, current ? `${current}, ${value}` : value);
        },
        status(code) { this.statusCode = code; return this; },
        json(body) { resolve({ status: this.statusCode, body }); return this; },
      };
      Promise.resolve(limiter(request, response, (error) => {
        if (error) reject(error);
        else resolve({ status: response.statusCode, body: null });
      })).catch(reject);
    });
  }
  assert.equal((await dispatch()).status, 200);
  assert.equal((await dispatch()).status, 200);
  assert.deepEqual(await dispatch(), { status: 429, body: { detail: 'Slow down' } });
  await new Promise(resolve => setTimeout(resolve, 150));
  assert.equal((await dispatch()).status, 200);
});
