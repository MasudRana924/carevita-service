const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const pool = require('../config/database');

const MIGRATIONS_DIR = path.join(__dirname, '../../migrations');

const isConcurrentMigration = (filename) => filename.endsWith('.concurrent.sql');

/**
 * Splits a migration file into statements. Line comments are removed first.
 * Statements here do not contain semicolons inside string literals.
 */
const splitSqlStatements = (sql) => sql
  .split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n')
  .split(';')
  .map((statement) => statement.trim())
  .filter(Boolean);

const stripConcurrently = (statement) => statement.replace(/\s+CONCURRENTLY\b/gi, '');

const directPoolConfig = (connectionString) => {
  const isLocalhost = /localhost|127\.0\.0\.1/.test(connectionString);
  return {
    connectionString,
    ssl: isLocalhost ? false : { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 20000
  };
};

const ensureMigrationsTable = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

const alreadyApplied = async (client, filename) => {
  const existing = await client.query(
    'SELECT 1 FROM schema_migrations WHERE filename = $1',
    [filename]
  );
  return existing.rows.length > 0;
};

const markApplied = async (client, filename) => {
  await client.query(
    'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING',
    [filename]
  );
};

/**
 * Runs one migration file if schema_migrations does not already list it.
 * Concurrent index files run outside a transaction.
 * @returns {'applied'|'skipped'|'missing'}
 */
const applyMigrationFile = async (filename, { client: externalClient } = {}) => {
  const sqlPath = path.join(MIGRATIONS_DIR, filename);
  if (!fs.existsSync(sqlPath)) return 'missing';

  const ownsClient = !externalClient;
  const client = externalClient || await pool.connect();
  let directPool = null;

  try {
    await ensureMigrationsTable(client);
    if (await alreadyApplied(client, filename)) return 'skipped';

    const sql = fs.readFileSync(sqlPath, 'utf8');
    const concurrent = isConcurrentMigration(filename);
    console.log(`Applying ${filename}...`);

    if (!concurrent) {
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await markApplied(client, filename);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
      console.log(`Applied: ${filename}`);
      return 'applied';
    }

    const directUrl = process.env.DATABASE_DIRECT_URL;
    let statements = splitSqlStatements(sql);
    let runQuery;

    if (directUrl) {
      directPool = new Pool(directPoolConfig(directUrl));
      runQuery = (statement) => directPool.query(statement);
    } else {
      console.warn(
        `${filename}: DATABASE_DIRECT_URL is unset, so indexes build once without CONCURRENTLY. Set DATABASE_DIRECT_URL to the non-pooler Postgres URL before a large-table build.`
      );
      statements = statements.map(stripConcurrently);
      runQuery = (statement) => client.query(statement);
    }

    for (const statement of statements) {
      await runQuery(statement);
    }
    await markApplied(client, filename);
    console.log(`Applied: ${filename}`);
    return 'applied';
  } finally {
    if (directPool) await directPool.end();
    if (ownsClient) client.release();
  }
};

/**
 * Versioned SQL migrator: applies migrations/*.sql once (sorted by filename),
 * tracked in schema_migrations.
 */
const migrateSql = async ({ closePool = true } = {}) => {
  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);

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
      const result = await applyMigrationFile(file, { client });
      if (result === 'applied') applied.push(file);
      else if (result === 'skipped') {
        console.log(`Skip (already applied): ${file}`);
        skipped.push(file);
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
module.exports.applyMigrationFile = applyMigrationFile;
module.exports.splitSqlStatements = splitSqlStatements;
module.exports.isConcurrentMigration = isConcurrentMigration;
module.exports.stripConcurrently = stripConcurrently;
