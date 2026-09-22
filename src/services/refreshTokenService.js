const pool = require('../config/database');
const {
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  getRefreshExpiresAt
} = require('../config/jwt');
const { hashToken, newFamilyId } = require('../utils/authHelpers');

const issueTokenPair = async (user, { familyId = null } = {}) => {
  const family = familyId || newFamilyId();
  const accessToken = generateToken({ userId: user.id, role: user.role });
  const refreshToken = generateRefreshToken({
    userId: user.id,
    familyId: family
  });

  const tokenHash = hashToken(refreshToken);
  const expiresAt = getRefreshExpiresAt();

  await pool.query(
    `
    INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at)
    VALUES ($1, $2, $3, $4)
    `,
    [user.id, tokenHash, family, expiresAt]
  );

  return {
    token: accessToken,
    refreshToken,
    familyId: family
  };
};

const revokeFamily = async (familyId, { exceptHash = null } = {}) => {
  if (!familyId) return;
  await pool.query(
    `
    UPDATE refresh_tokens
    SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
    WHERE family_id = $1
      AND revoked_at IS NULL
      AND ($2::text IS NULL OR token_hash <> $2)
    `,
    [familyId, exceptHash]
  );
};

const revokeAllForUser = async (userId) => {
  await pool.query(
    `
    UPDATE refresh_tokens
    SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
    WHERE user_id = $1 AND revoked_at IS NULL
    `,
    [userId]
  );
};

/**
 * Rotate refresh token. Detects reuse of revoked tokens and invalidates the session family.
 * @returns {{ token, refreshToken } | { reuseDetected: true } | { invalid: true }}
 */
const rotateRefreshToken = async (rawRefreshToken) => {
  if (!rawRefreshToken) return { invalid: true };

  let decoded;
  try {
    decoded = verifyRefreshToken(rawRefreshToken);
  } catch {
    return { invalid: true };
  }

  const userId = decoded.userId;
  const familyId = decoded.familyId;
  const tokenHash = hashToken(rawRefreshToken);

  const existing = await pool.query(
    `SELECT * FROM refresh_tokens WHERE token_hash = $1 LIMIT 1`,
    [tokenHash]
  );
  const row = existing.rows[0];

  // Unknown hash but valid JWT signature → treat as invalid (not issued by us / purged)
  if (!row) {
    if (familyId) {
      await revokeFamily(familyId);
      return { reuseDetected: true };
    }
    return { invalid: true };
  }

  // Reuse of revoked/replaced token → kill family
  if (row.revoked_at) {
    await revokeFamily(row.family_id);
    return { reuseDetected: true };
  }

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await pool.query(
      `UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE id = $1 AND revoked_at IS NULL`,
      [row.id]
    );
    return { invalid: true };
  }

  if (row.user_id !== userId) {
    await revokeFamily(row.family_id);
    return { reuseDetected: true };
  }

  const newRefresh = generateRefreshToken({
    userId: row.user_id,
    familyId: row.family_id
  });
  const newHash = hashToken(newRefresh);
  const expiresAt = getRefreshExpiresAt();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const inserted = await client.query(
      `
      INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at)
      VALUES ($1, $2, $3, $4)
      RETURNING id
      `,
      [row.user_id, newHash, row.family_id, expiresAt]
    );

    await client.query(
      `
      UPDATE refresh_tokens
      SET revoked_at = CURRENT_TIMESTAMP,
          replaced_by = $2
      WHERE id = $1
      `,
      [row.id, inserted.rows[0].id]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return {
    refreshToken: newRefresh,
    userId: row.user_id,
    familyId: row.family_id
  };
};

const logoutWithRefreshToken = async (rawRefreshToken) => {
  if (!rawRefreshToken) return { revoked: false };
  const tokenHash = hashToken(rawRefreshToken);

  const existing = await pool.query(
    `SELECT * FROM refresh_tokens WHERE token_hash = $1 LIMIT 1`,
    [tokenHash]
  );
  const row = existing.rows[0];
  if (!row) {
    // Still try JWT family if signature valid
    try {
      const decoded = verifyRefreshToken(rawRefreshToken);
      if (decoded.familyId) {
        await revokeFamily(decoded.familyId);
        return { revoked: true, familyId: decoded.familyId };
      }
    } catch {
      return { revoked: false };
    }
    return { revoked: false };
  }

  await revokeFamily(row.family_id);
  return { revoked: true, familyId: row.family_id, userId: row.user_id };
};

module.exports = {
  issueTokenPair,
  rotateRefreshToken,
  logoutWithRefreshToken,
  revokeFamily,
  revokeAllForUser
};
