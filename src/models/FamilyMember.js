const pool = require('../config/database');

const createFamilyMember = async (memberData) => {
  const {
    user_id, name, photo, age, gender, relationship, blood_group,
    address, emergency_contact, medical_history, existing_conditions,
    allergies, current_medications, preferred_hospital, preferred_doctor
  } = memberData;

  const query = `
    INSERT INTO family_members (
      user_id, name, photo, age, gender, relationship, blood_group,
      address, emergency_contact, medical_history, existing_conditions,
      allergies, current_medications, preferred_hospital, preferred_doctor
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *
  `;
  const values = [
    user_id, name, photo, age, gender, relationship, blood_group,
    address, emergency_contact, medical_history, existing_conditions,
    allergies, current_medications, preferred_hospital, preferred_doctor
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const findById = async (id) => {
  const query = 'SELECT * FROM family_members WHERE id = $1';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const findByUserId = async (user_id) => {
  const query = 'SELECT * FROM family_members WHERE user_id = $1 ORDER BY created_at DESC';
  const result = await pool.query(query, [user_id]);
  return result.rows;
};

const updateFamilyMember = async (id, memberData) => {
  const {
    name, photo, age, gender, relationship, blood_group,
    address, emergency_contact, medical_history, existing_conditions,
    allergies, current_medications, preferred_hospital, preferred_doctor
  } = memberData;

  const query = `
    UPDATE family_members 
    SET name = $1, photo = $2, age = $3, gender = $4, relationship = $5, blood_group = $6,
        address = $7, emergency_contact = $8, medical_history = $9, existing_conditions = $10,
        allergies = $11, current_medications = $12, preferred_hospital = $13, 
        preferred_doctor = $14, updated_at = CURRENT_TIMESTAMP
    WHERE id = $15
    RETURNING *
  `;
  const values = [
    name, photo, age, gender, relationship, blood_group,
    address, emergency_contact, medical_history, existing_conditions,
    allergies, current_medications, preferred_hospital, preferred_doctor, id
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const deleteFamilyMember = async (id) => {
  const query = 'DELETE FROM family_members WHERE id = $1 RETURNING *';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const findByUserIdAndId = async (user_id, id) => {
  const query = 'SELECT * FROM family_members WHERE user_id = $1 AND id = $2';
  const result = await pool.query(query, [user_id, id]);
  return result.rows[0];
};

module.exports = {
  createFamilyMember,
  findById,
  findByUserId,
  updateFamilyMember,
  deleteFamilyMember,
  findByUserIdAndId
};
