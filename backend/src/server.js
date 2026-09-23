const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const { initDb } = require('./db/init');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler.middleware');

const usersRoutes = require('./routes/users.routes');
const listingsRoutes = require('./routes/listings.routes');
const categoriesRoutes = require('./routes/categories.routes');
const chatRoutes = require('./routes/chat.routes');
const predictRoutes = require('./routes/predict.routes');
const messagesRoutes = require('./routes/messages.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();














app.use(cors({
  origin: env.clientUrl,
  credentials: true,
}));

app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to CampusNest API',
    campus: 'IIIT Sonepat',
    version: '1.0.0',
  });
});

app.use('/users', usersRoutes);
app.use('/listings', listingsRoutes);
app.use('/categories', categoriesRoutes);
app.use('/chat', chatRoutes);
app.use('/predict', predictRoutes);
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

  app.listen(env.port, () => {
    
    console.log(`CampusNest API (Express) listening on port ${env.port}`);
  });
}

start();

module.exports = app;
