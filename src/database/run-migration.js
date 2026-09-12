const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

const FILES = [
  'add_inbox_and_fcm.sql',
  'drop_unused_tables.sql',
  'fix_notification_tokens_unique.sql'
];

const runMigration = async () => {
  const client = await pool.connect();
  try {
    console.log('Connected to database');

    for (const file of FILES) {
      const sqlPath = path.join(__dirname, '../../migrations', file);
      if (!fs.existsSync(sqlPath)) {
        console.warn(`Skip missing file: ${file}`);
        continue;
      }
      console.log(`Running ${file}...`);
      const sql = fs.readFileSync(sqlPath, 'utf8');
      await client.query(sql);
      console.log(`Done: ${file}`);
    }

    const tables = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    console.log('\nRemaining tables:');
    tables.rows.forEach((row) => console.log(` - ${row.tablename}`));

    console.log('\nMigration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

runMigration();
