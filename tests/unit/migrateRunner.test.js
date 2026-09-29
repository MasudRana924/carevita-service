const {
  splitSqlStatements,
  isConcurrentMigration,
  stripConcurrently
} = require('../../src/database/migrateRunner');

describe('scale index migrations', () => {
  test('concurrent files are detected by name', () => {
    expect(isConcurrentMigration('add_scale_indexes.concurrent.sql')).toBe(true);
    expect(isConcurrentMigration('add_self_booking_and_scale_indexes.sql')).toBe(false);
  });

  test('splits index statements and can drop CONCURRENTLY for a pooler', () => {
    const sql = `
      -- comment
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_a ON bookings (user_id);

      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_b ON bookings (created_at);
    `;
    const statements = splitSqlStatements(sql).map(stripConcurrently);
    expect(statements).toEqual([
      'CREATE INDEX IF NOT EXISTS idx_a ON bookings (user_id)',
      'CREATE INDEX IF NOT EXISTS idx_b ON bookings (created_at)'
    ]);
  });
});
