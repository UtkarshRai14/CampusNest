require('dotenv').config();

const env = {
  port: parseInt(process.env.PORT || '8000', 10),
  // Comma-separated, so the deployed frontend and local development can both be allowed.
  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((url) => url.trim().replace(/\/+$/, ''))
    .filter(Boolean),

  databaseUrl: process.env.DATABASE_URL || '',

  jwtSecret: process.env.SECRET_KEY || 'campusnest-secret-key',
  jwtAlgorithm: process.env.ALGORITHM || 'HS256',
  accessTokenExpireMinutes: parseInt(process.env.ACCESS_TOKEN_EXPIRE_MINUTES || '10080', 10),

  geminiApiKey: process.env.GEMINI_API_KEY || '',

  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
};

// The development default is public, so tokens signed with it can be forged.
if (!process.env.SECRET_KEY) {
  if (process.env.NODE_ENV === 'production') {
    console.error('[config] SECRET_KEY must be set in production.');
    process.exit(1);
  }
  console.warn('[config] SECRET_KEY is not set - using an insecure development default. Set it in .env.');
}

if (!env.databaseUrl) {
  console.warn('[config] DATABASE_URL is not set - database connections will fail.');
}

module.exports = env;
