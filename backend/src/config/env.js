require('dotenv').config();





const env = {
  port: parseInt(process.env.PORT || '8000', 10),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  databaseUrl: process.env.DATABASE_URL || '',

  jwtSecret: process.env.SECRET_KEY || 'campusnest-secret-key',
  jwtAlgorithm: process.env.ALGORITHM || 'HS256',
  accessTokenExpireMinutes: parseInt(process.env.ACCESS_TOKEN_EXPIRE_MINUTES || '10080', 10),

  geminiApiKey: process.env.GEMINI_API_KEY || '',

  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',

  mlServiceUrl: process.env.ML_SERVICE_URL || 'http://localhost:8001',
};

if (!env.databaseUrl) {
  
  console.warn('[config] DATABASE_URL is not set - database connections will fail.');
}

module.exports = env;
