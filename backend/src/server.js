const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./config/env');
const pool = require('./db/pool');
const { initDb } = require('./db/init');
const { initRealtime } = require('./services/realtime.service');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler.middleware');
const limits = require('./middleware/rateLimit.middleware');

const usersRoutes = require('./routes/users.routes');
const listingsRoutes = require('./routes/listings.routes');
const categoriesRoutes = require('./routes/categories.routes');
const chatRoutes = require('./routes/chat.routes');
const messagesRoutes = require('./routes/messages.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

app.set('trust proxy', env.trustedProxyCidrs.length ? env.trustedProxyCidrs : false);
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: env.clientUrls,
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));

app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to CampusNest API',
    version: '1.0.0',
  });
});

app.get('/health/live', (req, res) => {
  res.json({ status: 'ok', service: 'campusnest-api' });
});

async function readiness(req, res) {
  try {
    await pool.query({ text: 'SELECT 1', query_timeout: 3000 });
    return res.json({ status: 'ok', service: 'campusnest-api' });
  } catch {
    return res.status(503).json({ status: 'error', service: 'campusnest-api' });
  }
}

app.get('/health/ready', readiness);
// Render uses this path as its readiness check; keep the existing endpoint.
app.get('/health', readiness);

app.use(limits.api);

app.use('/users', usersRoutes);
app.use('/listings', listingsRoutes);
app.use('/categories', categoriesRoutes);
app.use('/chat', chatRoutes);
app.use('/messages', messagesRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/admin', adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  try {
    await initDb();
  } catch (err) {
    console.error('[startup] Failed to initialize database schema:', err.message);
    process.exit(1);
  }

  // Socket.IO shares the API's port for live messaging.
  const server = http.createServer(app);
  initRealtime(server);

  server.listen(env.port, () => {
    console.log(`CampusNest API (Express) listening on port ${env.port}`);
  });
}

if (require.main === module) start();

module.exports = app;
module.exports.start = start;
