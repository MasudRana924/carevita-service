const pool = require('../config/database');

const createMedication = async (medicationData) => {
  const {
    user_id, family_member_id, medicine_name, dosage, frequency,
    start_date, end_date, instructions, reminder_enabled, reminder_times
  } = medicationData;

  const query = `
    INSERT INTO medications (
      user_id, family_member_id, medicine_name, dosage, frequency,
      start_date, end_date, instructions, reminder_enabled, reminder_times
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `;
  const values = [
    user_id, family_member_id, medicine_name, dosage, frequency,
    start_date, end_date, instructions, reminder_enabled, reminder_times
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const findMedicationById = async (id) => {
  const query = `
    SELECT m.*, fm.name as family_member_name, fm.photo as family_member_photo
    FROM medications m
    LEFT JOIN family_members fm ON m.family_member_id = fm.id
    WHERE m.id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const findMedicationsByUserId = async (user_id, filters = {}) => {
  let query = `
    SELECT m.*, fm.name as family_member_name, fm.photo as family_member_photo
    FROM medications m
    LEFT JOIN family_members fm ON m.family_member_id = fm.id
    WHERE m.user_id = $1
  `;
  const values = [user_id];
  let paramCount = 1;

  if (filters.family_member_id) {
    paramCount++;
    query += ` AND m.family_member_id = $${paramCount}`;
    values.push(filters.family_member_id);
  }

  if (filters.is_active !== undefined) {
    paramCount++;
    query += ` AND m.is_active = $${paramCount}`;
    values.push(filters.is_active);
  }

  query += ' ORDER BY m.created_at DESC';

  if (filters.limit) {
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    values.push(filters.limit);
  }

  const result = await pool.query(query, values);
  return result.rows;
};

const findMedicationsByFamilyMemberId = async (family_member_id, filters = {}) => {
  let query = 'SELECT * FROM medications WHERE family_member_id = $1';
  const values = [family_member_id];
  let paramCount = 1;

  if (filters.is_active !== undefined) {
    paramCount++;
    query += ` AND is_active = $${paramCount}`;
    values.push(filters.is_active);
  }

  query += ' ORDER BY created_at DESC';

  const result = await pool.query(query, values);
  return result.rows;
};

const updateMedication = async (id, medicationData) => {
  const {
    medicine_name, dosage, frequency, start_date, end_date,
    instructions, is_active, reminder_enabled, reminder_times
  } = medicationData;

  const query = `
    UPDATE medications 
    SET medicine_name = $1, dosage = $2, frequency = $3, start_date = $4,
        end_date = $5, instructions = $6, is_active = $7, reminder_enabled = $8,
        reminder_times = $9, updated_at = CURRENT_TIMESTAMP
    WHERE id = $10
    RETURNING *
  `;
  const values = [
    medicine_name, dosage, frequency, start_date, end_date,
    instructions, is_active, reminder_enabled, reminder_times, id
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const deleteMedication = async (id) => {
  const query = 'DELETE FROM medications WHERE id = $1 RETURNING *';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const getDueReminders = async (date) => {
  const query = `
    SELECT m.*, fm.name as family_member_name, fm.photo as family_member_photo,
      u.phone as user_phone, u.name as user_name
    FROM medications m
    LEFT JOIN family_members fm ON m.family_member_id = fm.id
    JOIN users u ON m.user_id = u.id
    WHERE m.is_active = true 
    AND m.reminder_enabled = true
    AND m.start_date <= $1
    AND (m.end_date IS NULL OR m.end_date >= $1)
  `;
  const result = await pool.query(query, [date]);
  return result.rows;
};

module.exports = {
  createMedication,
  findMedicationById,
  findMedicationsByUserId,
  findMedicationsByFamilyMemberId,
  updateMedication,
  deleteMedication,
  getDueReminders
};
