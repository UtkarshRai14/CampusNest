const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');

// Returns the user for a valid "Authorization: Bearer <token>" header, otherwise null.
async function getUserFromRequest(req) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) return null;

  return authService.getUserFromToken(token);
}

async function authenticate(req, res, next) {
  const hasToken = Boolean(req.headers.authorization);
  const user = await getUserFromRequest(req);

  if (!user) {
    res.set('WWW-Authenticate', 'Bearer');
    return res.status(401).json({ detail: hasToken ? 'Could not validate credentials' : 'Not authenticated' });
  }

  req.user = user;
  return next();
}

// For public routes that return extra data to logged-in users. Never rejects the request.
async function optionalAuthenticate(req, res, next) {
  req.user = await getUserFromRequest(req);
  return next();
}

function requireAdmin(req, res, next) {
  if (!req.user.is_admin) {
    return res.status(403).json({ detail: 'Admin access only' });
  }
  return next();
}

module.exports = {
  authenticate: asyncHandler(authenticate),
  optionalAuthenticate: asyncHandler(optionalAuthenticate),
  requireAdmin,
};
