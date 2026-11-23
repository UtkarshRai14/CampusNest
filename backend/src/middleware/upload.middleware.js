const multer = require('multer');
const sharp = require('sharp');
const HttpError = require('../utils/HttpError');

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_IMAGE_WIDTH = 5000;
const MAX_IMAGE_HEIGHT = 5000;
const MAX_IMAGE_PIXELS = 20_000_000;
const SUPPORTED_FORMATS = new Set(['jpeg', 'png', 'webp']);

async function inspectImageBuffer(buffer) {
  const image = sharp(buffer, { limitInputPixels: MAX_IMAGE_PIXELS, failOn: 'warning' });
  const metadata = await image.metadata();
  if (!SUPPORTED_FORMATS.has(metadata.format)) throw new HttpError(400, 'Only JPEG, PNG, and WebP images are supported');
  if (!metadata.width || !metadata.height
    || metadata.width > MAX_IMAGE_WIDTH || metadata.height > MAX_IMAGE_HEIGHT
    || metadata.width * metadata.height > MAX_IMAGE_PIXELS) {
    throw new HttpError(400, 'Image dimensions are too large');
  }
  if (metadata.pages && metadata.pages > 1) throw new HttpError(400, 'Animated images are not supported');
  // Statistics force a full decode without allocating another full-size output buffer.
  await image.stats();
  return metadata;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1, fields: 20, parts: 22 },
});

async function validateImage(req, res, next) {
  if (!req.file) return next();
  try {
    await inspectImageBuffer(req.file.buffer);
    return next();
  } catch (error) {
    if (error instanceof HttpError) return next(error);
    return next(new HttpError(400, 'Uploaded file is not a valid supported image'));
  }
}

module.exports = { upload, validateImage, inspectImageBuffer, MAX_FILE_SIZE, MAX_IMAGE_WIDTH, MAX_IMAGE_HEIGHT, MAX_IMAGE_PIXELS };
