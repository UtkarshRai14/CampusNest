const userModel = require('../models/user.model');
const authService = require('../services/auth.service');
const HttpError = require('../utils/HttpError');
const {
  isMissing, parseText, parseCollegeEmail, parsePassword, parseSemester, parseMobile,
} = require('../utils/validators');

const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 128;

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

  const newUser = await userModel.create({
    name, email, password: authService.hashPassword(password), phone, department, school, semester, enrollmentNo,
  });
  return res.json(authResponse(newUser));
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
  return res.json(authResponse(user));
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

module.exports = { register, login, getMe, updateMe };
