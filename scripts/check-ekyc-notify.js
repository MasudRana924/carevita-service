require('../src/config/loadEnv');
const pool = require('../src/config/database');

const uid = '4a20fff7-724c-4d80-8796-aae112e68efb';

(async () => {
  const user = await pool.query(
    'SELECT id, email, language_preference, ekyc_status, ekyc_session_status, ekyc_verified_at FROM users WHERE id = $1',
    [uid]
  );
  const tokens = await pool.query(
    `SELECT id, platform, is_active, left(token, 12) AS token_prefix, length(token) AS token_len, created_at, updated_at
     FROM notification_tokens WHERE user_id = $1`,
    [uid]
  );
  const inbox = await pool.query(
    `SELECT id, type, title, created_at FROM inbox WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
    [uid]
  );
  const audit = await pool.query(
    `SELECT action, created_at FROM audit_logs
     WHERE entity_id = $1 AND action LIKE 'EKYC%'
     ORDER BY created_at DESC LIMIT 10`,
    [uid]
  );
  console.log(JSON.stringify({
    user: user.rows,
    tokens: tokens.rows,
    inbox: inbox.rows,
    audit: audit.rows
  }, null, 2));
  await pool.end();
})().catch(async (error) => {
  console.error(error.message);
  try { await pool.end(); } catch (_) { /* ignore */ }
  process.exit(1);
});
