const pool = require('../config/database');

const createAvailabilitySlot = async (slotData) => {
  const { provider_id, provider_type, date, start_time, end_time, is_available } = slotData;
  
  const query = `
    INSERT INTO availability_slots (provider_id, provider_type, date, start_time, end_time, is_available)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  const values = [provider_id, provider_type, date, start_time, end_time, is_available];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const getAvailabilityByProvider = async (provider_id, provider_type, filters = {}) => {
  let query = `
    SELECT * FROM availability_slots 
    WHERE provider_id = $1 AND provider_type = $2
  `;
  const values = [provider_id, provider_type];
  let paramCount = 2;

  if (filters.date_from) {
    paramCount++;
    query += ` AND date >= $${paramCount}`;
    values.push(filters.date_from);
  }

  if (filters.date_to) {
    paramCount++;
    query += ` AND date <= $${paramCount}`;
    values.push(filters.date_to);
  }

  query += ' ORDER BY date ASC, start_time ASC';

  const result = await pool.query(query, values);
  return result.rows;
};

const getSlotById = async (id) => {
  const query = 'SELECT * FROM availability_slots WHERE id = $1';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const updateSlot = async (id, updateData) => {
  const { start_time, end_time, is_available } = updateData;
  
  const query = `
    UPDATE availability_slots 
    SET start_time = COALESCE($1, start_time),
        end_time = COALESCE($2, end_time),
        is_available = COALESCE($3, is_available),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $4
    RETURNING *
  `;
  const values = [start_time, end_time, is_available, id];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const deleteSlot = async (id) => {
  const query = 'DELETE FROM availability_slots WHERE id = $1 RETURNING *';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const deleteSlotsByProvider = async (provider_id, provider_type) => {
  const query = 'DELETE FROM availability_slots WHERE provider_id = $1 AND provider_type = $2 RETURNING *';
  const result = await pool.query(query, [provider_id, provider_type]);
  return result.rows;
};

module.exports = {
  createAvailabilitySlot,
  getAvailabilityByProvider,
  getSlotById,
  updateSlot,
  deleteSlot,
  deleteSlotsByProvider
};
