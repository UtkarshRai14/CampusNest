require('dotenv').config();

const nodeEnv = process.env.NODE_ENV || 'development';
const jwtAlgorithms = new Set(['HS256', 'HS384', 'HS512']);
const jwtAlgorithm = process.env.ALGORITHM || 'HS256';
const configuredExpiry = process.env.ACCESS_TOKEN_EXPIRE_MINUTES;
const defaultExpiry = nodeEnv === 'production' ? 60 : 10080;
const accessTokenExpireMinutes = configuredExpiry === undefined
  ? defaultExpiry
  : Number(configuredExpiry);
const suppliedSecret = process.env.SECRET_KEY || '';
const developmentSecret = 'campusnest-secret-key';
const minimumSecretBytes = { HS256: 32, HS384: 48, HS512: 64 }[jwtAlgorithm];

if (!jwtAlgorithms.has(jwtAlgorithm)) {
  throw new Error('ALGORITHM must be one of HS256, HS384, or HS512.');
}
if (!Number.isInteger(accessTokenExpireMinutes) || accessTokenExpireMinutes < 5 || accessTokenExpireMinutes > 10080) {
  throw new Error('ACCESS_TOKEN_EXPIRE_MINUTES must be an integer between 5 and 10080.');
}
if (nodeEnv === 'production' && (!suppliedSecret || suppliedSecret === developmentSecret || Buffer.byteLength(suppliedSecret) < minimumSecretBytes)) {
  throw new Error(`Production requires a non-default SECRET_KEY of at least ${minimumSecretBytes} bytes for ${jwtAlgorithm}.`);
}
if (suppliedSecret === developmentSecret && !['development', 'test'].includes(nodeEnv)) {
  throw new Error('The development SECRET_KEY is permitted only in development and test environments.');
}
if (!suppliedSecret && !['development', 'test'].includes(nodeEnv)) {
  throw new Error('SECRET_KEY must be configured outside development and test environments.');
}

const env = {
  port: parseInt(process.env.PORT || '8000', 10),
  // Comma-separated, so the deployed frontend and local development can both be allowed.
  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((url) => url.trim().replace(/\/+$/, ''))
    .filter(Boolean),

  databaseUrl: process.env.DATABASE_URL || '',
  appUrl: (process.env.APP_URL || process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/+$/, ''),
  smtpHost: process.env.SMTP_HOST || process.env.SMTP_Host || '',
  smtpPort: parseInt(process.env.SMTP_PORT || process.env.SMTP_Port || '587', 10),
  smtpUser: process.env.SMTP_USER || process.env.SMTP_User || '',
  smtpPassword: process.env.SMTP_PASSWORD || process.env.SMTP_Password || '',
  smtpFrom: process.env.SMTP_FROM || process.env.SMTP_USER || process.env.SMTP_User || '',

  nodeEnv,
  jwtSecret: suppliedSecret || developmentSecret,
  jwtAlgorithm,
  accessTokenExpireMinutes,
  trustedProxyCidrs: (process.env.TRUSTED_PROXY_CIDRS || '').split(',').map((value) => value.trim()).filter(Boolean),

  geminiApiKey: process.env.GEMINI_API_KEY || '',

  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
};

if (!suppliedSecret) console.warn('[config] SECRET_KEY is not set - using the development-only default. Set it in .env.');

if (!env.databaseUrl) {
  console.warn('[config] DATABASE_URL is not set - database connections will fail.');
}

module.exports = env;
