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






async function deleteImage(publicId) {
  const result = await cloudinary.uploader.destroy(publicId);
  return result.result === 'ok';
}

module.exports = { uploadImage, deleteImage };
