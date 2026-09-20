const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

const MIGRATIONS_DIR = path.join(__dirname, '../../migrations');

/**
 * Versioned SQL migrator: applies migrations/*.sql once (sorted by filename),
 * tracked in schema_migrations.
 */
const migrateSql = async ({ closePool = true } = {}) => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    if (!fs.existsSync(MIGRATIONS_DIR)) {
      console.warn(`Migrations directory not found: ${MIGRATIONS_DIR}`);
      return { applied: [], skipped: [] };
    }

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((name) => name.endsWith('.sql'))
      .sort();

    const applied = [];
    const skipped = [];

    for (const file of files) {
      const existing = await client.query(
        'SELECT 1 FROM schema_migrations WHERE filename = $1',
        [file]
      );
      if (existing.rows.length > 0) {
        console.log(`Skip (already applied): ${file}`);
        skipped.push(file);
        continue;
      }

      const sqlPath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(sqlPath, 'utf8');
      console.log(`Applying ${file}...`);

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`Applied: ${file}`);
        applied.push(file);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    console.log(
      `migrate:sql done — applied ${applied.length}, skipped ${skipped.length}`
    );
    return { applied, skipped };
  } finally {
    client.release();
    if (closePool) {
      await pool.end();
    }
  }
};

if (require.main === module) {
  migrateSql()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('migrate:sql failed:', err.message);
      process.exit(1);
    });
}

module.exports = migrateSql;
