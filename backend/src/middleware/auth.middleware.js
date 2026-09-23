const authService = require('../services/auth.service');
const userModel = require('../models/user.model');


const ADMIN_EMAILS = ['admin@campusnest.com'];



















async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    res.set('WWW-Authenticate', 'Bearer');
    return res.status(401).json({ detail: 'Not authenticated' });
  }

  const credentialsError = () => {
    res.set('WWW-Authenticate', 'Bearer');
    return res.status(401).json({ detail: 'Could not validate credentials' });
  };

  const payload = authService.decodeToken(token);
  if (!payload) return credentialsError();

  const userId = payload.sub;
  if (userId === undefined || userId === null) return credentialsError();

  const parsedId = parseInt(userId, 10);
  if (Number.isNaN(parsedId)) return credentialsError();

  const user = await userModel.findById(parsedId);
  if (!user) return credentialsError();

  req.user = user;
  return next();
}


function requireAdmin(req, res, next) {
  if (!ADMIN_EMAILS.includes(req.user.email)) {
    return res.status(403).json({ detail: 'Admin access only' });
  }
  return next();
}

module.exports = { authenticate, requireAdmin };
