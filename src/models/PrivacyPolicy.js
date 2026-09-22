const pool = require('../config/database');

const AUDIENCES = ['USER', 'CAREGIVER'];

const findByAudience = async (audience, { publishedOnly = false } = {}) => {
  const result = await pool.query(
    `
    SELECT *
    FROM privacy_policies
    WHERE audience = $1
      AND ($2::boolean = false OR is_published = true)
    `,
    [audience, publishedOnly]
  );
  return result.rows[0] || null;
};

const listAll = async ({ publishedOnly = false } = {}) => {
  const result = await pool.query(
    `
    SELECT *
    FROM privacy_policies
    WHERE ($1::boolean = false OR is_published = true)
    ORDER BY audience ASC
    `,
    [publishedOnly]
  );
  return result.rows;
};

/**
 * Upsert one policy per audience (create on first write, update thereafter).
 */
const upsert = async ({
  audience,
  title,
  content,
  version,
  isPublished = true,
  actorId
}) => {
  const result = await pool.query(
    `
    INSERT INTO privacy_policies (
      audience, title, content, version, is_published, created_by, updated_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, $6)
    ON CONFLICT (audience) DO UPDATE SET
      title = EXCLUDED.title,
      content = EXCLUDED.content,
      version = EXCLUDED.version,
      is_published = EXCLUDED.is_published,
      updated_by = EXCLUDED.updated_by,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
    `,
    [
      audience,
      title,
      content,
      version || '1.0',
      isPublished !== false,
      actorId || null
    ]
  );
  return result.rows[0];
};

module.exports = {
  AUDIENCES,
  findByAudience,
  listAll,
  upsert
};
