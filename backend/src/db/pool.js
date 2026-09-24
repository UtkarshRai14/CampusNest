const { Pool, types } = require('pg');
const env = require('../config/env');










types.setTypeParser(1114, (val) => val);




const pool = new Pool({
  connectionString: env.databaseUrl,
});

pool.on('error', (err) => {
  
  console.error('[db] Unexpected error on idle client', err);
});

module.exports = pool;
