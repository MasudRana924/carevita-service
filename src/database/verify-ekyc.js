require('dotenv').config();
const pool = require('../config/database');

(async () => {
  try {
    const info = await pool.query(`
      SELECT
        current_database() AS database,
        current_user AS user,
        inet_server_addr() AS server_addr,
        current_setting('server_version') AS version
    `);
    console.log('=== connection ===');
    console.log(info.rows[0]);

    const cols = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users'
      ORDER BY ordinal_position
    `);
    console.log('\n=== users columns ===');
    cols.rows.forEach((r) => console.log(`- ${r.column_name}`));

    const hasEkyc = cols.rows.some((r) => r.column_name === 'ekyc_status');
    console.log('\nhas ekyc_status:', hasEkyc);

    if (!hasEkyc) {
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS ekyc_status BOOLEAN DEFAULT false NOT NULL');
      console.log('ALTER applied');
    }

    // Force-set default for any nulls
    await pool.query('UPDATE users SET ekyc_status = false WHERE ekyc_status IS NULL');

    const sample = await pool.query(`
      SELECT id, email, name, is_verified, ekyc_status, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 5
    `);
    console.log('\n=== latest 5 users ===');
    console.log(sample.rows);

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error(error);
    try { await pool.end(); } catch (_) {}
    process.exit(1);
  }
})();
