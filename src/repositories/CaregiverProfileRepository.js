const BaseRepository = require('./BaseRepository');

/**
 * Caregiver Profile Repository
 * Handles all caregiver profile-related database operations
 */
class CaregiverProfileRepository extends BaseRepository {
  constructor() {
    super('caregiver_profiles');
  }

  /**
   * Find caregiver profile by user ID
   */
  async findByUserId(userId) {
    const query = `
      SELECT cp.*, u.name, u.phone, u.email, u.profile_photo
      FROM ${this.tableName} cp
      JOIN users u ON cp.user_id = u.id
      WHERE cp.user_id = $1
    `;
    const result = await this.pool.query(query, [userId]);
    return result.rows[0];
  }

  /**
   * Find caregiver profile by ID
   */
  async findById(id) {
    const query = `
      SELECT cp.*, u.name, u.phone, u.email, u.profile_photo
      FROM ${this.tableName} cp
      JOIN users u ON cp.user_id = u.id
      WHERE cp.id = $1
    `;
    const result = await this.pool.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Search caregivers with filters
   */
  async search(filters = {}, options = {}) {
    const {
      district,
      thana,
      provider_type,
      gender,
      verification_status,
      is_available,
      min_rating,
      max_hourly_rate,
      service_areas
    } = filters;
    const { limit = 20, offset = 0, orderBy = 'created_at DESC' } = options;

    let query = `
      SELECT cp.*, u.name, u.phone, u.email, u.profile_photo,
             COALESCE(AVG(r.rating), 0) as avg_rating,
             COUNT(r.id) as review_count
      FROM ${this.tableName} cp
      JOIN users u ON cp.user_id = u.id
      LEFT JOIN reviews r ON cp.id = r.caregiver_profile_id
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 0;

    if (district) {
      paramCount++;
      query += ` AND cp.district = $${paramCount}`;
      values.push(district);
    }

    if (thana) {
      paramCount++;
      query += ` AND cp.thana = $${paramCount}`;
      values.push(thana);
    }

    if (provider_type) {
      paramCount++;
      query += ` AND cp.provider_type = $${paramCount}`;
      values.push(provider_type);
    }

    if (gender) {
      paramCount++;
      query += ` AND cp.gender = $${paramCount}`;
      values.push(gender);
    }

    if (verification_status) {
      paramCount++;
      query += ` AND cp.verification_status = $${paramCount}`;
      values.push(verification_status);
    }

    if (is_available !== undefined) {
      paramCount++;
      query += ` AND cp.is_available = $${paramCount}`;
      values.push(is_available);
    }

    if (min_rating) {
      paramCount++;
      query += ` HAVING COALESCE(AVG(r.rating), 0) >= $${paramCount}`;
      values.push(min_rating);
    }

    if (max_hourly_rate) {
      paramCount++;
      query += ` AND cp.hourly_rate <= $${paramCount}`;
      values.push(max_hourly_rate);
    }

    if (service_areas && service_areas.length > 0) {
      paramCount++;
      query += ` AND cp.service_areas && $${paramCount}`;
      values.push(service_areas);
    }

    query += ` GROUP BY cp.id, u.id ORDER BY ${orderBy} LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    values.push(limit, offset);

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  /**
   * Check if caregiver is eligible for booking
   */
  async isEligibleForBooking(profile) {
    return (
      profile.verification_status === 'APPROVED' &&
      profile.is_available === true &&
      !profile.deleted_at
    );
  }

  /**
   * Check caregiver availability for specific time
   */
  async checkAvailability(profileId, bookingDate, startTime, endTime, excludeBookingId = null) {
    let query = `
      SELECT COUNT(*)::int as count
      FROM bookings
      WHERE provider_id = $1
        AND booking_date = $2
        AND status NOT IN ('CANCELLED_BY_USER', 'CANCELLED_BY_PROVIDER', 'CANCELLED_BY_ADMIN')
        AND (
          (start_time < $3 AND end_time > $4) OR
          (start_time >= $3 AND start_time < $4) OR
          (end_time > $3 AND end_time <= $4)
        )
    `;
    const values = [profileId, bookingDate, endTime, startTime];

    if (excludeBookingId) {
      query += ` AND id != $5`;
      values.push(excludeBookingId);
    }

    const result = await this.pool.query(query, values);
    return result.rows[0].count === 0;
  }

  /**
   * Update rating
   */
  async updateRating(profileId, avgRating) {
    const query = `
      UPDATE ${this.tableName}
      SET rating = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await this.pool.query(query, [avgRating, profileId]);
    return result.rows[0];
  }

  /**
   * Increment completed bookings count
   */
  async incrementCompletedBookings(profileId) {
    const query = `
      UPDATE ${this.tableName}
      SET completed_bookings = COALESCE(completed_bookings, 0) + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.pool.query(query, [profileId]);
    return result.rows[0];
  }

  /**
   * Update verification status
   */
  async updateVerificationStatus(profileId, status, note = null) {
    const query = `
      UPDATE ${this.tableName}
      SET verification_status = $1,
          verification_note = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    const result = await this.pool.query(query, [status, note, profileId]);
    return result.rows[0];
  }

  /**
   * Update availability
   */
  async updateAvailability(profileId, isAvailable) {
    const query = `
      UPDATE ${this.tableName}
      SET is_available = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await this.pool.query(query, [isAvailable, profileId]);
    return result.rows[0];
  }

  /**
   * Get caregiver services
   */
  async getServices(profileId) {
    const query = `
      SELECT cps.*, s.name as service_name, s.category
      FROM caregiver_provider_services cps
      JOIN services s ON cps.service_id = s.id
      WHERE cps.provider_id = $1 AND cps.is_active = true
    `;
    const result = await this.pool.query(query, [profileId]);
    return result.rows;
  }

  /**
   * Add service to caregiver profile
   */
  async addService(profileId, serviceId, customPrice = null) {
    const query = `
      INSERT INTO caregiver_provider_services (provider_id, service_id, custom_price, is_active)
      VALUES ($1, $2, $3, true)
      ON CONFLICT (provider_id, service_id) 
      DO UPDATE SET custom_price = $3, is_active = true, updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const result = await this.pool.query(query, [profileId, serviceId, customPrice]);
    return result.rows[0];
  }
}

module.exports = new CaregiverProfileRepository();
