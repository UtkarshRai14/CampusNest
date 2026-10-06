const { Pool, types } = require('pg');
const env = require('../config/env');

// TIMESTAMP columns are stored in UTC without a zone. Return them as ISO strings
// with a "Z" so the browser converts them to the user's local time correctly.
types.setTypeParser(1114, (val) => new Date(`${val.replace(' ', 'T')}Z`).toISOString());

const pool = new Pool({
  connectionString: env.databaseUrl,
});

pool.on('error', (err) => {
  console.error('[db] Unexpected error on idle client', err);
});

module.exports = pool;
