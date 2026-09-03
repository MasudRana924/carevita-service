const pool = require('../config/database');

class MedicineOrder {
  static async create(orderData) {
    const {
      user_id, family_member_id, prescription_url, items, subtotal,
      delivery_fee, discount, total_amount, delivery_address,
      delivery_lat, delivery_long, scheduled_delivery, payment_method
    } = orderData;

    const order_number = `MO${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const query = `
      INSERT INTO medicine_orders (
        order_number, user_id, family_member_id, prescription_url, items, subtotal,
        delivery_fee, discount, total_amount, delivery_address, delivery_lat, delivery_long,
        scheduled_delivery, payment_method
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;
    const values = [
      order_number, user_id, family_member_id, prescription_url, items, subtotal,
      delivery_fee, discount, total_amount, delivery_address, delivery_lat, delivery_long,
      scheduled_delivery, payment_method
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT mo.*, 
        u.name as customer_name, u.phone as customer_phone,
        fm.name as family_member_name
      FROM medicine_orders mo
      JOIN users u ON mo.user_id = u.id
      LEFT JOIN family_members fm ON mo.family_member_id = fm.id
      WHERE mo.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findByOrderNumber(order_number) {
    const query = `
      SELECT mo.*, 
        u.name as customer_name, u.phone as customer_phone,
        fm.name as family_member_name
      FROM medicine_orders mo
      JOIN users u ON mo.user_id = u.id
      LEFT JOIN family_members fm ON mo.family_member_id = fm.id
      WHERE mo.order_number = $1
    `;
    const result = await pool.query(query, [order_number]);
    return result.rows[0];
  }

  static async findByUserId(user_id, filters = {}) {
    let query = `
      SELECT mo.*, fm.name as family_member_name
      FROM medicine_orders mo
      LEFT JOIN family_members fm ON mo.family_member_id = fm.id
      WHERE mo.user_id = $1
    `;
    const values = [user_id];
    let paramCount = 1;

    if (filters.status) {
      paramCount++;
      query += ` AND mo.status = $${paramCount}`;
      values.push(filters.status);
    }

    query += ' ORDER BY mo.created_at DESC';

    if (filters.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      values.push(filters.limit);
    }

    if (filters.offset) {
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      values.push(filters.offset);
    }

    const result = await pool.query(query, values);
    return result.rows;
  }

  static async update(id, orderData) {
    const {
      items, subtotal, delivery_fee, discount, total_amount,
      delivery_address, delivery_lat, delivery_long, scheduled_delivery
    } = orderData;

    const query = `
      UPDATE medicine_orders 
      SET items = $1, subtotal = $2, delivery_fee = $3, discount = $4,
          total_amount = $5, delivery_address = $6, delivery_lat = $7, delivery_long = $8,
          scheduled_delivery = $9, updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `;
    const values = [
      items, subtotal, delivery_fee, discount, total_amount,
      delivery_address, delivery_lat, delivery_long, scheduled_delivery, id
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async updateStatus(id, status) {
    const query = `
      UPDATE medicine_orders 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [status, id]);
    return result.rows[0];
  }

  static async updatePaymentStatus(id, payment_status) {
    const query = `
      UPDATE medicine_orders 
      SET payment_status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [payment_status, id]);
    return result.rows[0];
  }

  static async cancel(id) {
    const query = `
      UPDATE medicine_orders 
      SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findAll(filters = {}) {
    let query = `
      SELECT mo.*, u.name as customer_name, fm.name as family_member_name
      FROM medicine_orders mo
      JOIN users u ON mo.user_id = u.id
      LEFT JOIN family_members fm ON mo.family_member_id = fm.id
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 0;

    if (filters.status) {
      paramCount++;
      query += ` AND mo.status = $${paramCount}`;
      values.push(filters.status);
    }

    if (filters.date_from) {
      paramCount++;
      query += ` AND mo.created_at >= $${paramCount}`;
      values.push(filters.date_from);
    }

    if (filters.date_to) {
      paramCount++;
      query += ` AND mo.created_at <= $${paramCount}`;
      values.push(filters.date_to);
    }

    query += ' ORDER BY mo.created_at DESC';

    if (filters.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      values.push(filters.limit);
    }

    if (filters.offset) {
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      values.push(filters.offset);
    }

    const result = await pool.query(query, values);
    return result.rows;
  }
}

module.exports = MedicineOrder;
