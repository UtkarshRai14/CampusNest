const crypto = require('crypto');
const userModel = require('../models/user.model');
const authService = require('../services/auth.service');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/email.service');
const HttpError = require('../utils/HttpError');
const {
  isMissing, parseText, parseCollegeEmail, parsePassword, parseSemester, parseMobile,
} = require('../utils/validators');

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

function userResponseShape(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    department: user.department,
    school: user.school,
    semester: user.semester,
    whatsapp: user.whatsapp || null,
    share_email: Boolean(user.share_email),
    share_whatsapp: Boolean(user.share_whatsapp),
    is_admin: Boolean(user.is_admin),
    created_at: user.created_at,
  };
}

function authResponse(user) {
  const token = authService.createAccessToken({ sub: String(user.id), ver: Number(user.token_version || 0) });
  return { access_token: token, token_type: 'bearer', user: userResponseShape(user) };
}

function createVerificationToken() {
  const token = crypto.randomBytes(32).toString('hex');
  return {
    token,
    tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
    expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
  };
}

function createPasswordResetToken() {
  const token = crypto.randomBytes(32).toString('hex');
  return {
    token,
    tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
    expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
  };
}

async function register(req, res) {
  const body = req.body || {};

  const name = parseText(body.name, 'Name', { max: 100 });
  const email = parseCollegeEmail(body.email);
  const password = parsePassword(body.password, { min: MIN_PASSWORD_LENGTH, max: MAX_PASSWORD_LENGTH });
  const department = parseText(body.department, 'Department', { max: 150 });
  const school = parseText(body.school, 'School', { max: 150 });
  const semester = parseSemester(body.semester);
  const enrollmentNo = parseText(body.enrollment_no, 'Enrollment number', { max: 50 });
  const phone = isMissing(body.phone) ? null : parseMobile(body.phone, 'Phone number');

  if (await userModel.findByEmail(email)) {
    return res.json({ message: 'If the details can be registered, verification instructions will be sent.' });
  }
  if (await userModel.findByEnrollmentNo(enrollmentNo)) {
    return res.json({ message: 'If the details can be registered, verification instructions will be sent.' });
  }

  const verification = createVerificationToken();
  let newUser;
  try {
    newUser = await userModel.create({
      name, email, password: await authService.hashPassword(password), phone, department, school, semester, enrollmentNo,
      emailVerificationTokenHash: verification.tokenHash,
      emailVerificationExpiresAt: verification.expiresAt,
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.json({ message: 'If the details can be registered, verification instructions will be sent.' });
    }
    throw error;
  }

  try {
    await sendVerificationEmail(email, name, verification.token);
  } catch (error) {
    await userModel.deleteById(newUser.id);
    console.error('[email] Initial verification delivery failed:', error.code || error.name || 'delivery error');
    throw new HttpError(503, 'Could not send the verification email. Please try again later.');
  }

  return res.json({ message: 'Account created. Check your email to verify your account.' });
}

async function login(req, res) {
  const { email, password } = req.body || {};
  if (isMissing(email) || typeof password !== 'string' || password === '') {
    throw new HttpError(400, 'Email and password are required');
  }

  const user = await userModel.findByEmail(String(email).trim().toLowerCase());
  if (!user || !(await authService.verifyPassword(password, user.password))) {
    throw new HttpError(401, 'Invalid email or password');
  }
  if (!user.email_verified) {
    throw new HttpError(401, 'Invalid email or password');
  }
  return res.json(authResponse(user));
}

async function verifyEmail(req, res) {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  if (!/^[a-f0-9]{64}$/.test(token)) {
    throw new HttpError(400, 'Invalid or expired verification link');
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const user = await userModel.markEmailVerified(tokenHash);
  if (!user) throw new HttpError(400, 'Invalid or expired verification link');
  return res.json({ message: 'Email verified successfully. You can now log in.' });
}

async function resendVerification(req, res) {
  const email = parseCollegeEmail(req.body?.email);
  const user = await userModel.findByEmail(email);

  if (!user || user.email_verified) {
    return res.json({ message: 'If an account needs verification, a new email has been sent.' });
  }

  const verification = createVerificationToken();
  try {
    await userModel.resendVerification(user.id, verification.tokenHash, verification.expiresAt,
      (lockedUser) => sendVerificationEmail(lockedUser.email, lockedUser.name, verification.token));
  } catch (error) {
    if (!error.deliveryFailure) throw error;
    console.error('[email] Verification resend failed:', error.code || error.name || 'delivery error');
    throw new HttpError(503, 'Verification email could not be sent. Please try again later.');
  }
  return res.json({ message: 'If an account needs verification, a new email has been sent.' });
}

async function forgotPassword(req, res) {
  const email = parseCollegeEmail(req.body?.email);
  const reset = createPasswordResetToken();
  try {
    await userModel.requestPasswordReset(email, reset.tokenHash, reset.expiresAt,
      (user) => sendPasswordResetEmail(user.email, user.name, reset.token));
  } catch (error) {
    if (!error.deliveryFailure) throw error;
    // Keep the public response identical for known and unknown addresses. The DB
    // transaction rolls back so a failed delivery cannot invalidate an older link.
    console.error('[email] Password reset delivery failed:', error.code || error.name || 'delivery error');
  }
  return res.json({ message: 'If an account exists for that email, password reset instructions will be sent.' });
}

async function resetPassword(req, res) {
  const token = typeof req.body?.token === 'string' ? req.body.token : '';
  if (!/^[a-f0-9]{64}$/.test(token)) throw new HttpError(400, 'Invalid or expired password reset link');
  const password = parsePassword(req.body?.password, { min: MIN_PASSWORD_LENGTH, max: MAX_PASSWORD_LENGTH });
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const user = await userModel.consumePasswordReset(tokenHash, await authService.hashPassword(password));
  if (!user) throw new HttpError(400, 'Invalid or expired password reset link');
  return res.json({ message: 'Password reset successfully. Please log in again.' });
}

async function getMe(req, res) {
  return res.json(userResponseShape(req.user));
}

// A field that is missing is left unchanged; an empty phone/WhatsApp clears the saved number.
async function updateMe(req, res) {
  const { name, phone, semester, whatsapp, share_email: shareEmail, share_whatsapp: shareWhatsapp } = req.body || {};
  const updates = {};

  if (name !== undefined) updates.name = parseText(name, 'Name', { max: 100 });
  if (semester !== undefined) updates.semester = parseSemester(semester);
  if (phone !== undefined) updates.phone = isMissing(phone) ? null : parseMobile(phone, 'Phone number');
  if (whatsapp !== undefined) updates.whatsapp = isMissing(whatsapp) ? null : parseMobile(whatsapp, 'WhatsApp number');
  if (shareEmail !== undefined) {
    if (typeof shareEmail !== 'boolean') throw new HttpError(400, 'Email sharing preference must be true or false');
    updates.shareEmail = shareEmail;
  }
  if (shareWhatsapp !== undefined) {
    if (typeof shareWhatsapp !== 'boolean') throw new HttpError(400, 'WhatsApp sharing preference must be true or false');
    updates.shareWhatsapp = shareWhatsapp;
  }

  const updated = await userModel.updateProfile(req.user.id, updates);
  return res.json({ message: 'Profile updated', user: userResponseShape(updated) });
}

module.exports = { register, login, verifyEmail, resendVerification, forgotPassword, resetPassword, getMe, updateMe };
