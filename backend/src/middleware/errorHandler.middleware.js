const HttpError = require('../utils/HttpError');

// Express recognises an error handler by its four arguments, so `next` must stay.
function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ detail: err.detail });
  }

  // PostgreSQL unique_violation
  if (err.code === '23505') {
    return res.status(400).json({ detail: 'This record already exists' });
  }

  // PostgreSQL foreign_key_violation
  if (err.code === '23503') {
    return res.status(400).json({ detail: 'Cannot delete: related records still exist' });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ detail: 'Request body is not valid JSON' });
  }

  if (err.name === 'MulterError') {
    return res.status(400).json({ detail: err.message });
  }

  console.error('[error]', err);
  return res.status(500).json({ detail: 'Internal server error' });
}

function notFoundHandler(req, res) {
  res.status(404).json({ detail: 'Not found' });
}

module.exports = { errorHandler, notFoundHandler };
