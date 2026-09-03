const pool = require('../config/database');

const createMedicalRecord = async (recordData) => {
  const {
    user_id, family_member_id, record_type, title, description,
    file_url, file_type, record_date, hospital_id, doctor_id, is_confidential
  } = recordData;

  const query = `
    INSERT INTO medical_records (
      user_id, family_member_id, record_type, title, description,
      file_url, file_type, record_date, hospital_id, doctor_id, is_confidential
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `;
  const values = [
    user_id, family_member_id, record_type, title, description,
    file_url, file_type, record_date, hospital_id, doctor_id, is_confidential
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const findMedicalRecordById = async (id) => {
  const query = `
    SELECT mr.*, 
      fm.name as family_member_name, fm.photo as family_member_photo,
      h.name as hospital_name, d.name as doctor_name
    FROM medical_records mr
    LEFT JOIN family_members fm ON mr.family_member_id = fm.id
    LEFT JOIN hospitals h ON mr.hospital_id = h.id
    LEFT JOIN doctors d ON mr.doctor_id = d.id
    WHERE mr.id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const findMedicalRecordsByUserId = async (user_id, filters = {}) => {
  let query = `
    SELECT mr.*, fm.name as family_member_name, fm.photo as family_member_photo,
      h.name as hospital_name, d.name as doctor_name
    FROM medical_records mr
    LEFT JOIN family_members fm ON mr.family_member_id = fm.id
    LEFT JOIN hospitals h ON mr.hospital_id = h.id
    LEFT JOIN doctors d ON mr.doctor_id = d.id
    WHERE mr.user_id = $1
  `;
  const values = [user_id];
  let paramCount = 1;

  if (filters.family_member_id) {
    paramCount++;
    query += ` AND mr.family_member_id = $${paramCount}`;
    values.push(filters.family_member_id);
  }

  if (filters.record_type) {
    paramCount++;
    query += ` AND mr.record_type = $${paramCount}`;
    values.push(filters.record_type);
  }

  query += ' ORDER BY mr.record_date DESC, mr.created_at DESC';

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
};

const findMedicalRecordsByFamilyMemberId = async (family_member_id, filters = {}) => {
  let query = `
    SELECT mr.*, h.name as hospital_name, d.name as doctor_name
    FROM medical_records mr
    LEFT JOIN hospitals h ON mr.hospital_id = h.id
    LEFT JOIN doctors d ON mr.doctor_id = d.id
    WHERE mr.family_member_id = $1
  `;
  const values = [family_member_id];
  let paramCount = 1;

  if (filters.record_type) {
    paramCount++;
    query += ` AND mr.record_type = $${paramCount}`;
    values.push(filters.record_type);
  }

  query += ' ORDER BY mr.record_date DESC, mr.created_at DESC';

  if (filters.limit) {
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    values.push(filters.limit);
  }

  const result = await pool.query(query, values);
  return result.rows;
};

const updateMedicalRecord = async (id, recordData) => {
  const {
    title, description, file_url, file_type, record_date,
    hospital_id, doctor_id, is_confidential
  } = recordData;

  const query = `
    UPDATE medical_records 
    SET title = $1, description = $2, file_url = $3, file_type = $4,
        record_date = $5, hospital_id = $6, doctor_id = $7, is_confidential = $8,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $9
    RETURNING *
  `;
  const values = [
    title, description, file_url, file_type, record_date,
    hospital_id, doctor_id, is_confidential, id
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const deleteMedicalRecord = async (id) => {
  const query = 'DELETE FROM medical_records WHERE id = $1 RETURNING *';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

module.exports = {
  createMedicalRecord,
  findMedicalRecordById,
  findMedicalRecordsByUserId,
  findMedicalRecordsByFamilyMemberId,
  updateMedicalRecord,
  deleteMedicalRecord
};
