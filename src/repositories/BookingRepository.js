const BaseRepository = require('./BaseRepository');

/**
 * Booking Repository
 * Handles all booking-related database operations
 */
class BookingRepository extends BaseRepository {
  constructor() {
    super('bookings');
  }

  /**
   * Find bookings by user ID with pagination
   */
  async findByUserId(userId, options = {}) {
    const { status, limit = 20, offset = 0 } = options;
    let query = `
      SELECT b.* 
      FROM ${this.tableName} b
      WHERE b.user_id = $1
    `;
    const values = [userId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      query += ` AND b.status = $${paramCount}`;
      values.push(status);
    }

    query += ` ORDER BY b.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    values.push(limit, offset);

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  /**
   * Count bookings by user ID
   */
  async countByUserId(userId, options = {}) {
    const { status } = options;
    let query = `SELECT COUNT(*)::int as count FROM ${this.tableName} WHERE user_id = $1`;
    const values = [userId];

    if (status) {
      query += ` AND status = $2`;
      values.push(status);
    }

    const result = await this.pool.query(query, values);
    return result.rows[0].count;
  }

  /**
   * Find bookings by provider ID
   */
  async findByProviderId(providerId, options = {}) {
    const { status, limit = 20, offset = 0 } = options;
    let query = `
      SELECT b.* 
      FROM ${this.tableName} b
      WHERE b.provider_id = $1
    `;
    const values = [providerId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      query += ` AND b.status = $${paramCount}`;
      values.push(status);
    }

    query += ` ORDER BY b.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    values.push(limit, offset);

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  /**
   * Get booking status history
   */
  async getStatusHistory(bookingId) {
    const query = `
      SELECT * FROM booking_status_history
      WHERE booking_id = $1
      ORDER BY created_at ASC
    `;
    const result = await this.pool.query(query, [bookingId]);
    return result.rows;
  }

  /**
   * Add status history entry
   */
  async addStatusHistory(bookingId, oldStatus, newStatus, userId, notes = null, location = null) {
    const query = `
      INSERT INTO booking_status_history 
      (booking_id, old_status, new_status, changed_by, notes, location_lat, location_long)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [
      bookingId,
      oldStatus,
      newStatus,
      userId,
      notes,
      location?.lat || null,
      location?.lng || null
    ];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Update booking status
   */
  async updateStatus(bookingId, status) {
    const query = `
      UPDATE ${this.tableName}
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await this.pool.query(query, [status, bookingId]);
    return result.rows[0];
  }

  /**
   * Set offer expiry
   */
  async setOfferExpiry(bookingId, expiryMinutes = 15) {
    const expiryTime = new Date(Date.now() + expiryMinutes * 60 * 1000);
    const query = `
      UPDATE ${this.tableName}
      SET offer_expires_at = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await this.pool.query(query, [expiryTime, bookingId]);
    return result.rows[0];
  }

  /**
   * Clear offer expiry
   */
  async clearOfferExpiry(bookingId) {
    const query = `
      UPDATE ${this.tableName}
      SET offer_expires_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.pool.query(query, [bookingId]);
    return result.rows[0];
  }

  /**
   * Assign provider to booking
   */
  async assignProvider(bookingId, providerId, status = 'PROVIDER_ASSIGNED') {
    const query = `
      UPDATE ${this.tableName}
      SET provider_id = $1, status = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    const result = await this.pool.query(query, [providerId, status, bookingId]);
    return result.rows[0];
  }

  /**
   * Add rejection record
   */
  async addRejection(bookingId, providerId, reason) {
    const query = `
      INSERT INTO booking_rejections (booking_id, provider_id, reason)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const result = await this.pool.query(query, [bookingId, providerId, reason]);
    return result.rows[0];
  }

  /**
   * Start service
   */
  async startService(bookingId, location = null) {
    const query = `
      UPDATE ${this.tableName}
      SET status = 'SERVICE_IN_PROGRESS', 
          service_started_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.pool.query(query, [bookingId]);
    return result.rows[0];
  }

  /**
   * Complete service
   */
  async completeService(bookingId) {
    const query = `
      UPDATE ${this.tableName}
      SET status = 'SERVICE_COMPLETED', 
          service_completed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.pool.query(query, [bookingId]);
    return result.rows[0];
  }

  /**
   * Cancel booking
   */
  async cancelBooking(bookingId, cancelStatus, reason = null) {
    const query = `
      UPDATE ${this.tableName}
      SET status = $1, 
          cancellation_reason = $2,
          cancelled_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    const result = await this.pool.query(query, [cancelStatus, reason, bookingId]);
    return result.rows[0];
  }

  /**
   * Settle earning to wallet
   */
  async settleEarning(bookingId) {
    const query = `
      UPDATE ${this.tableName}
      SET earning_settled_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.pool.query(query, [bookingId]);
    return result.rows[0];
  }

  /**
   * Find bookings by date range
   */
  async findByDateRange(startDate, endDate, options = {}) {
    const { providerId, status } = options;
    let query = `
      SELECT * FROM ${this.tableName}
      WHERE booking_date >= $1 AND booking_date <= $2
    `;
    const values = [startDate, endDate];
    let paramCount = 2;

    if (providerId) {
      paramCount++;
      query += ` AND provider_id = $${paramCount}`;
      values.push(providerId);
    }

    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      values.push(status);
    }

    query += ' ORDER BY booking_date ASC, start_time ASC';

    const result = await this.pool.query(query, values);
    return result.rows;
  }
}

module.exports = new BookingRepository();
