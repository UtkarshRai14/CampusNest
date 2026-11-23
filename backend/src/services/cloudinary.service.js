const cloudinary = require('cloudinary').v2;
const env = require('../config/env');

cloudinary.config({
  cloud_name: env.cloudinaryCloudName,
  api_key: env.cloudinaryApiKey,
  api_secret: env.cloudinaryApiSecret,
});

function uploadImage(fileBuffer) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'campusnest',
        transformation: [
          { width: 800, height: 800, crop: 'limit' },
          { quality: 'auto' },
          { fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve(result.secure_url);
      }
    );
    uploadStream.end(fileBuffer);
  });
}

function getCampusNestPublicId(imageUrl) {
  if (typeof imageUrl !== 'string' || !imageUrl) return null;
  try {
    const url = new URL(imageUrl);
    if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com') return null;
    const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
    if (parts[0] !== env.cloudinaryCloudName || parts[1] !== 'image') return null;
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex < 0) return null;
    const versionIndex = parts.findIndex((part, index) => index > uploadIndex && /^v\d+$/.test(part));
    if (versionIndex < 0) return null;
    const assetParts = parts.slice(versionIndex + 1);
    if (assetParts[0] !== 'campusnest' || assetParts.some((part) => part === '.' || part === '..')) return null;
    const lastIndex = assetParts.length - 1;
    assetParts[lastIndex] = assetParts[lastIndex].replace(/\.[a-z0-9]+$/i, '');
    if (!assetParts[lastIndex]) return null;
    return assetParts.join('/');
  } catch {
    return null;
  }
}

async function deleteListingImage(imageUrl) {
  if (!imageUrl) return true;
  const publicId = getCampusNestPublicId(imageUrl);
  if (!publicId) return false;
  const result = await cloudinary.uploader.destroy(publicId, { invalidate: true });
  return result.result === 'ok' || result.result === 'not found';
}

module.exports = { uploadImage, getCampusNestPublicId, deleteListingImage };
