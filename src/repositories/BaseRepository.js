const pool = require('../config/database');

/**
 * Base Repository Class
 * Provides common database operations for all repositories
 */
class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
    this.pool = pool;
  }

  /**
   * Find by ID
   */
  async findById(id, columns = '*') {
    const query = `SELECT ${columns} FROM ${this.tableName} WHERE id = $1`;
    const result = await this.pool.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Find one by conditions
   */
  async findOne(conditions, columns = '*') {
    const { query, values } = this.buildWhereQuery(conditions);
    const sql = `SELECT ${columns} FROM ${this.tableName} WHERE ${query}`;
    const result = await this.pool.query(sql, values);
    return result.rows[0];
  }

  /**
   * Find many by conditions
   */
  async findMany(conditions = {}, options = {}, columns = '*') {
    const { query, values } = this.buildWhereQuery(conditions);
    let sql = `SELECT ${columns} FROM ${this.tableName}`;
    
    if (query) {
      sql += ` WHERE ${query}`;
    }

    // Add order by
    if (options.orderBy) {
      sql += ` ORDER BY ${options.orderBy}`;
    }

    // Add limit
    if (options.limit) {
      sql += ` LIMIT $${values.length + 1}`;
      values.push(options.limit);
    }

    // Add offset
    if (options.offset) {
      sql += ` OFFSET $${values.length + 1}`;
      values.push(options.offset);
    }

    const result = await this.pool.query(sql, values);
    return result.rows;
  }

  /**
   * Count records by conditions
   */
  async count(conditions = {}) {
    const { query, values } = this.buildWhereQuery(conditions);
    let sql = `SELECT COUNT(*)::int as count FROM ${this.tableName}`;
    
    if (query) {
      sql += ` WHERE ${query}`;
    }

    const result = await this.pool.query(sql, values);
    return result.rows[0].count;
  }

  /**
   * Create a new record
   */
  async create(data) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    
    const query = `
      INSERT INTO ${this.tableName} (${columns.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;
    
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Update a record by ID
   */
  async update(id, data) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map((col, i) => `${col} = $${i + 2}`).join(', ');
    
    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [id, ...values]);
    return result.rows[0];
  }

  /**
   * Delete a record by ID (soft delete if supported)
   */
  async delete(id, softDelete = true) {
    if (softDelete) {
      const query = `
        UPDATE ${this.tableName}
        SET deleted_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;
      const result = await this.pool.query(query, [id]);
      return result.rows[0];
    } else {
      const query = `DELETE FROM ${this.tableName} WHERE id = $1 RETURNING *`;
      const result = await this.pool.query(query, [id]);
      return result.rows[0];
    }
  }

  /**
   * Build WHERE query from conditions object
   */
  buildWhereQuery(conditions) {
    const keys = Object.keys(conditions);
    if (keys.length === 0) {
      return { query: '', values: [] };
    }

    const values = [];
    const conditionsArray = keys.map((key, index) => {
      values.push(conditions[key]);
      return `${key} = $${index + 1}`;
    });

    return {
      query: conditionsArray.join(' AND '),
      values
    };
  }

  /**
   * Execute raw query
   */
  async query(sql, values = []) {
    const result = await this.pool.query(sql, values);
    return result.rows;
  }

  /**
   * Execute transaction
   */
  async transaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = BaseRepository;
