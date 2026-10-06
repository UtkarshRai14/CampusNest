const multer = require('multer');
const HttpError = require('../utils/HttpError');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    return cb(new HttpError(400, 'Only image files can be uploaded'));
  },
});

module.exports = upload;
