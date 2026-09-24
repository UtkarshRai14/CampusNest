const pool = require('./pool');
























async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR NOT NULL,
      email VARCHAR NOT NULL UNIQUE,
      password VARCHAR NOT NULL,
      phone VARCHAR,
      department VARCHAR NOT NULL,
      school VARCHAR NOT NULL,
      semester INTEGER NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'utc')
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS ix_users_email ON users (email);`);

  
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS enrollment_no VARCHAR;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp VARCHAR;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS availability VARCHAR DEFAULT 'Available after 7 PM';`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS auto_reply VARCHAR DEFAULT 'Thanks for your interest! I will get back to you after 7 PM today. \u{1F64F}';`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS listings (
      id SERIAL PRIMARY KEY,
      title VARCHAR NOT NULL,
      description TEXT,
      price DOUBLE PRECISION NOT NULL,
      condition INTEGER NOT NULL,
      category VARCHAR NOT NULL,
      listing_type VARCHAR NOT NULL DEFAULT 'sell'
        CHECK (listing_type IN ('sell', 'rent', 'borrow', 'swap')),
      department_tag VARCHAR,
      semester_tag INTEGER,
      image_url VARCHAR,
      is_active BOOLEAN DEFAULT TRUE,
      is_flagged BOOLEAN DEFAULT FALSE,
      seller_id INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'utc')
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS ix_listings_id ON listings (id);`);

  
  
  
  
  
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      content TEXT NOT NULL,
      sender_id INTEGER REFERENCES users(id),
      listing_id INTEGER REFERENCES listings(id),
      receiver_id INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'utc')
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_history (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      role VARCHAR NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'utc')
    );
  `);

  
  console.log('[db] Schema is up to date.');
}

module.exports = { initDb };
