const BaseRepository = require('./BaseRepository');

/**
 * User Repository
 * Handles all user-related database operations
 */
class UserRepository extends BaseRepository {
  constructor() {
    super('users');
  }

  /**
   * Find user by phone number
   */
  async findByPhone(phone) {
    const query = `SELECT * FROM ${this.tableName} WHERE phone = $1`;
    const result = await this.pool.query(query, [phone]);
    return result.rows[0];
  }

  /**
   * Find user by email
   */
  async findByEmail(email) {
    const query = `SELECT * FROM ${this.tableName} WHERE email = $1`;
    const result = await this.pool.query(query, [email]);
    return result.rows[0];
  }

  /**
   * Find user by phone or email
   */
  async findByPhoneOrEmail(phone, email) {
    const query = `SELECT * FROM ${this.tableName} WHERE phone = $1 OR email = $2`;
    const result = await this.pool.query(query, [phone, email]);
    return result.rows[0];
  }

  /**
   * Update user profile
   */
  async updateProfile(userId, data) {
    const allowedFields = ['name', 'email', 'profile_photo'];
    const updates = [];
    const values = [];
    let paramCount = 1;

    Object.keys(data).forEach(key => {
      if (allowedFields.includes(key) && data[key] !== undefined) {
        updates.push(`${key} = $${paramCount}`);
        values.push(data[key]);
        paramCount++;
      }
    });

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    const query = `
      UPDATE ${this.tableName}
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;
    values.push(userId);

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Update password
   */
  async updatePassword(userId, hashedPassword) {
    const query = `
      UPDATE ${this.tableName}
      SET password = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await this.pool.query(query, [hashedPassword, userId]);
    return result.rows[0];
  }

  /**
   * Update eKYC status
   */
  async updateEkycStatus(userId, ekycStatus, referenceId = null) {
    const query = `
      UPDATE ${this.tableName}
      SET ekyc_status = $1,
          ekyc_reference_id = $2,
          ekyc_verified_at = CASE WHEN $1 = true THEN CURRENT_TIMESTAMP ELSE ekyc_verified_at END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    const result = await this.pool.query(query, [ekycStatus, referenceId, userId]);
    return result.rows[0];
  }

  /**
   * Find users by role
   */
  async findByRole(role, options = {}) {
    const { limit = 20, offset = 0 } = options;
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE role = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await this.pool.query(query, [role, limit, offset]);
    return result.rows;
  }

  /**
   * Count users by role
   */
  async countByRole(role) {
    const query = `SELECT COUNT(*)::int as count FROM ${this.tableName} WHERE role = $1`;
    const result = await this.pool.query(query, [role]);
    return result.rows[0].count;
  }
}

module.exports = new UserRepository();
