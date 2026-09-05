const pool = require('../config/database');

const createFamilyMember = async (memberData) => {
  const {
    user_id, name, photo, date_of_birth, gender, relationship, blood_group,
    address_id, emergency_contact_name, emergency_contact_phone, medical_history,
    existing_conditions, allergies, current_medications, description
  } = memberData;

  const query = `
    INSERT INTO family_members (
      user_id, name, photo, date_of_birth, gender, relationship, blood_group,
      address_id, emergency_contact_name, emergency_contact_phone, medical_history,
      existing_conditions, allergies, current_medications, description
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *
  `;
  const values = [
    user_id, name, photo, date_of_birth, gender, relationship, blood_group,
    address_id, emergency_contact_name, emergency_contact_phone, medical_history,
    existing_conditions, allergies, current_medications, description
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
    name, photo, date_of_birth, gender, relationship, blood_group,
    address_id, emergency_contact_name, emergency_contact_phone, medical_history,
    existing_conditions, allergies, current_medications, description
  } = memberData;

  const query = `
    UPDATE family_members 
    SET name = COALESCE($1, name),
        photo = COALESCE($2, photo),
        date_of_birth = COALESCE($3, date_of_birth),
        gender = COALESCE($4, gender),
        relationship = COALESCE($5, relationship),
        blood_group = COALESCE($6, blood_group),
        address_id = COALESCE($7, address_id),
        emergency_contact_name = COALESCE($8, emergency_contact_name),
        emergency_contact_phone = COALESCE($9, emergency_contact_phone),
        medical_history = COALESCE($10, medical_history),
        existing_conditions = COALESCE($11, existing_conditions),
        allergies = COALESCE($12, allergies),
        current_medications = COALESCE($13, current_medications),
        description = COALESCE($14, description),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $15
    RETURNING *
  `;
  const values = [
    name, photo, date_of_birth, gender, relationship, blood_group,
    address_id, emergency_contact_name, emergency_contact_phone, medical_history,
    existing_conditions, allergies, current_medications, description, id
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
