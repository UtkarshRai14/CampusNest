const HttpError = require('../utils/HttpError');









function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    if (err.extraHeaders) {
      for (const [key, value] of Object.entries(err.extraHeaders)) {
        res.set(key, value);
      }
    }
    return res.status(err.status).json({ detail: err.detail });
  }

  
  
  
  if (err.code === '23505') {
    return res.status(400).json({ detail: 'This record already exists' });
  }

  
  
  
  
  if (err.code === '23503') {
    return res.status(400).json({ detail: 'Cannot delete: related records still exist' });
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
