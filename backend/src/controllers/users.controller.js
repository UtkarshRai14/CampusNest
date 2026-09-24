const userModel = require('../models/user.model');
const authService = require('../services/auth.service');
const HttpError = require('../utils/HttpError');

function validationError(missingFields) {
  return new HttpError(
    422,
    missingFields.map((field) => ({ msg: `${field} is required`, loc: ['body', field] }))
  );
}

function userResponseShape(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    department: user.department,
    school: user.school,
    semester: user.semester,
    created_at: user.created_at,
  };
}


async function register(req, res) {
  const { name, email, password, phone, department, school, semester, enrollment_no: enrollmentNo } = req.body || {};

  const missing = [];
  if (!name) missing.push('name');
  if (!email) missing.push('email');
  if (!password) missing.push('password');
  if (!department) missing.push('department');
  if (!school) missing.push('school');
  if (semester === undefined || semester === null || semester === '') missing.push('semester');
  if (missing.length > 0) throw validationError(missing);

  const existing = await userModel.findByEmail(email);
  if (existing) {
    throw new HttpError(400, 'Email already registered');
  }

  const hashed = authService.hashPassword(password);
  const newUser = await userModel.create({
    name, email, password: hashed, phone, department, school,
    semester: parseInt(semester, 10), enrollmentNo,
  });

  const token = authService.createAccessToken({ sub: String(newUser.id) });
  return res.json({
    access_token: token,
    token_type: 'bearer',
    user: userResponseShape(newUser),
  });
}


async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    throw validationError([!email && 'email', !password && 'password'].filter(Boolean));
  }

  const user = await userModel.findByEmail(email);
  if (!user) {
    throw new HttpError(401, 'Invalid email or password');
  }
  if (!authService.verifyPassword(password, user.password)) {
    throw new HttpError(401, 'Invalid email or password');
  }

  const token = authService.createAccessToken({ sub: String(user.id) });
  return res.json({
    access_token: token,
    token_type: 'bearer',
    user: userResponseShape(user),
  });
}


async function getMe(req, res) {
  return res.json(userResponseShape(req.user));
}








async function updateMe(req, res) {
  const { name, phone, semester, whatsapp } = req.query;
  await userModel.updateProfile(req.user.id, {
    name,
    phone,
    semester: semester ? parseInt(semester, 10) : undefined,
    whatsapp,
  });
  return res.json({ message: 'Profile updated' });
}

module.exports = { register, login, getMe, updateMe };
