const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const pool = require('../src/db/pool');
const { initDb } = require('../src/db/init');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
const ADVISORY_LOCK = [72891342, 1];
const CORE_TABLES = ['users', 'listings', 'messages', 'chat_history'];

async function tableCount(client) {
  const { rows } = await client.query(
    `SELECT ${CORE_TABLES.map((name) => `to_regclass('public.${name}') IS NOT NULL AS ${name}`).join(', ')}`
  );
  return CORE_TABLES.filter((name) => rows[0][name]).length;
}

function readMigrations() {
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter((name) => /^\d{4}_[a-z0-9_-]+\.sql$/i.test(name))
    .sort()
    .map((name) => {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8');
      return { name, sql, checksum: crypto.createHash('sha256').update(sql).digest('hex') };
    });
}

async function runMigrations() {
  const client = await pool.connect();
  let locked = false;
  try {
    await client.query('SELECT pg_advisory_lock($1, $2)', ADVISORY_LOCK);
    locked = true;
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR PRIMARY KEY,
        checksum VARCHAR NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const { rows: history } = await client.query('SELECT version, checksum FROM schema_migrations');
    const applied = new Map(history.map((row) => [row.version, row.checksum]));

    if (!applied.has('0000_legacy_baseline')) {
      const existingCoreTables = await tableCount(client);
      if (existingCoreTables !== 0 && existingCoreTables !== CORE_TABLES.length) {
        throw new Error('Database has a partial CampusNest schema. No baseline was recorded; inspect it before migrating.');
      }

      // Retain the existing idempotent initializer as the known legacy baseline.
      // It is run under the same advisory lock, then its state is recorded before
      // versioned migrations are applied.
      await initDb(client);
      await client.query(
        'INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING',
        ['0000_legacy_baseline', 'initDb-v1']
      );
    }

    for (const migration of readMigrations()) {
      const priorChecksum = applied.get(migration.name);
      if (priorChecksum) {
        if (priorChecksum !== migration.checksum) throw new Error(`Applied migration ${migration.name} has changed; add a forward migration instead.`);
        continue;
      }

      await client.query('BEGIN');
      try {
        await client.query(migration.sql);
        await client.query(
          'INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)',
          [migration.name, migration.checksum]
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
      console.log(`[migrate] Applied ${migration.name}`);
    }
  } finally {
    if (locked) await client.query('SELECT pg_advisory_unlock($1, $2)', ADVISORY_LOCK);
    client.release();
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => console.log('[migrate] Database is up to date.'))
    .catch((error) => {
      console.error(`[migrate] ${error.message}`);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}

module.exports = { runMigrations, readMigrations };
