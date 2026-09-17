const pool = require('../config/database');

const writeAudit = async ({
  actorId = null,
  action,
  entityType,
  entityId = null,
  meta = {}
}) => {
  try {
    await pool.query(
      `
      INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, meta)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [actorId, action, entityType, entityId, JSON.stringify(meta || {})]
    );
  } catch (error) {
    console.error('Audit log failed:', error.message);
  }
};

const listAuditLogs = async ({ entityType, entityId, page = 1, limit = 20 } = {}) => {
  const offset = (page - 1) * limit;
  const values = [];
  let where = 'WHERE 1=1';
  let i = 0;

  if (entityType) {
    i += 1;
    where += ` AND entity_type = $${i}`;
    values.push(entityType);
  }
  if (entityId) {
    i += 1;
    where += ` AND entity_id = $${i}`;
    values.push(entityId);
  }

  const listQuery = `
    SELECT a.*, u.name as actor_name, u.role as actor_role
    FROM audit_logs a
    LEFT JOIN users u ON u.id = a.actor_id
    ${where}
    ORDER BY a.created_at DESC
    LIMIT $${i + 1} OFFSET $${i + 2}
  `;
  const countQuery = `SELECT COUNT(*)::int AS count FROM audit_logs a ${where}`;

  const [rows, count] = await Promise.all([
    pool.query(listQuery, [...values, limit, offset]),
    pool.query(countQuery, values)
  ]);

  return { items: rows.rows, total: count.rows[0].count };
};

module.exports = { writeAudit, listAuditLogs };
