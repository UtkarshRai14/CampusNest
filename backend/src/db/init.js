const pool = require('./pool');

// Schema is created with CREATE TABLE IF NOT EXISTS and evolved with idempotent
// ALTER statements, so it is safe to run on every startup (fresh or existing DB).
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

  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS enrollment_no VARCHAR;`);
  // No two accounts share an enrollment number; case is ignored ("21cs001" = "21CS001").
  // Registration requires one, but accounts created before that may still have none.
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS users_enrollment_no_key ON users (UPPER(enrollment_no));`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp VARCHAR;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;`);

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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      content TEXT NOT NULL,
      sender_id INTEGER REFERENCES users(id),
      listing_id INTEGER REFERENCES listings(id),
      receiver_id INTEGER NOT NULL REFERENCES users(id),
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'utc')
    );
  `);

  // Databases created before read-tracking: existing messages count as already read,
  // only messages created from now on start as unread.
  await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT TRUE;`);
  await pool.query(`ALTER TABLE messages ALTER COLUMN is_read SET DEFAULT FALSE;`);

  // Databases created before receiver_id was a real reference. NOT VALID enforces the
  // constraint for new rows without failing on any old orphaned rows.
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'messages_receiver_id_fkey') THEN
        ALTER TABLE messages
          ADD CONSTRAINT messages_receiver_id_fkey
          FOREIGN KEY (receiver_id) REFERENCES users(id) NOT VALID;
      END IF;
    END $$;
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
