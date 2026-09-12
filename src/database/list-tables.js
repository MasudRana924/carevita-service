require('dotenv').config();
const pool = require('../config/database');

(async () => {
  try {
    const r = await pool.query(
      "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
    );
    console.log(r.rows.map((x) => x.tablename).join('\n'));
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
