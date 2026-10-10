const crypto = require('crypto');
const userModel = require('../models/user.model');
const authService = require('../services/auth.service');
const { sendVerificationEmail } = require('../services/email.service');
const HttpError = require('../utils/HttpError');
const {
  isMissing, parseText, parseCollegeEmail, parsePassword, parseSemester, parseMobile,
} = require('../utils/validators');

const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 128;
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function userResponseShape(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    department: user.department,
    school: user.school,
    semester: user.semester,
    whatsapp: user.whatsapp || null,
    is_admin: Boolean(user.is_admin),
    created_at: user.created_at,
  };
}

function authResponse(user) {
  const token = authService.createAccessToken({ sub: String(user.id) });
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
    throw new HttpError(400, 'Email already registered');
  }
  if (await userModel.findByEnrollmentNo(enrollmentNo)) {
    throw new HttpError(400, 'Enrollment number already registered');
  }

  const verification = createVerificationToken();
  const newUser = await userModel.create({
    name, email, password: authService.hashPassword(password), phone, department, school, semester, enrollmentNo,
    emailVerificationTokenHash: verification.tokenHash,
    emailVerificationExpiresAt: verification.expiresAt,
  });

  try {
    await sendVerificationEmail(email, name, verification.token);
  } catch (error) {
    await userModel.deleteById(newUser.id);
    console.error('[email] Failed to send verification email:', error.message);
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
  if (!user || !authService.verifyPassword(password, user.password)) {
    throw new HttpError(401, 'Invalid email or password');
  }
  if (!user.email_verified) {
    throw new HttpError(403, 'Please verify your email before logging in');
  }
  return res.json(authResponse(user));
}

async function verifyEmail(req, res) {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  if (!/^[a-f0-9]{64}$/.test(token)) {
    throw new HttpError(400, 'Invalid or expired verification link');
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const user = await userModel.findByVerificationTokenHash(tokenHash);
  if (!user) {
    throw new HttpError(400, 'Invalid or expired verification link');
  }

  await userModel.markEmailVerified(user.id);
  return res.json({ message: 'Email verified successfully. You can now log in.' });
}

async function resendVerification(req, res) {
  const email = parseCollegeEmail(req.body?.email);
  const user = await userModel.findByEmail(email);

  if (!user || user.email_verified) {
    return res.json({ message: 'If an account needs verification, a new email has been sent.' });
  }

  const verification = createVerificationToken();
  await userModel.updateVerificationToken(user.id, verification.tokenHash, verification.expiresAt);
  try {
    await sendVerificationEmail(user.email, user.name, verification.token);
  } catch (error) {
    console.error('[email] Failed to resend verification email:', error.message);
  }
  return res.json({ message: 'If an account needs verification, a new email has been sent.' });
}

async function getMe(req, res) {
  return res.json(userResponseShape(req.user));
}

// A field that is missing is left unchanged; an empty phone/WhatsApp clears the saved number.
async function updateMe(req, res) {
  const { name, phone, semester, whatsapp } = req.body || {};
  const updates = {};

  if (name !== undefined) updates.name = parseText(name, 'Name', { max: 100 });
  if (semester !== undefined) updates.semester = parseSemester(semester);
  if (phone !== undefined) updates.phone = isMissing(phone) ? null : parseMobile(phone, 'Phone number');
  if (whatsapp !== undefined) updates.whatsapp = isMissing(whatsapp) ? null : parseMobile(whatsapp, 'WhatsApp number');

  const updated = await userModel.updateProfile(req.user.id, updates);
  return res.json({ message: 'Profile updated', user: userResponseShape(updated) });
}

module.exports = { register, login, verifyEmail, resendVerification, getMe, updateMe };
