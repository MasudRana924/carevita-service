const pool = require('../config/database');

const createFamilyMember = async (memberData) => {
  const {
    user_id,
    name,
    photo,
    date_of_birth,
    gender,
    relationship,
    blood_group,
    phone,
    district,
    thana,
    house,
    emergency_contact_name,
    emergency_contact_phone,
    medical_history,
    existing_conditions,
    allergies,
    current_medications
  } = memberData;

  const query = `
    INSERT INTO family_members (
      user_id, name, photo, date_of_birth, gender, relationship, blood_group, phone,
      district, thana, house,
      emergency_contact_name, emergency_contact_phone, medical_history,
      existing_conditions, allergies, current_medications
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    RETURNING *
  `;
  const values = [
    user_id, name, photo, date_of_birth, gender, relationship, blood_group, phone,
    district, thana, house,
    emergency_contact_name, emergency_contact_phone, medical_history,
    existing_conditions, allergies, current_medications
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const findById = async (id) => {
  const result = await pool.query('SELECT * FROM family_members WHERE id = $1', [id]);
  return result.rows[0];
};

const findByUserId = async (user_id) => {
  const result = await pool.query(
    'SELECT * FROM family_members WHERE user_id = $1 ORDER BY created_at DESC',
    [user_id]
  );
  return result.rows;
};

const updateFamilyMember = async (id, memberData) => {
  const {
    name,
    photo,
    date_of_birth,
    gender,
    relationship,
    blood_group,
    phone,
    district,
    thana,
    house,
    emergency_contact_name,
    emergency_contact_phone,
    medical_history,
    existing_conditions,
    allergies,
    current_medications
  } = memberData;

  const query = `
    UPDATE family_members
    SET name = COALESCE($1, name),
        photo = COALESCE($2, photo),
        date_of_birth = COALESCE($3, date_of_birth),
        gender = COALESCE($4, gender),
        relationship = COALESCE($5, relationship),
        blood_group = COALESCE($6, blood_group),
        phone = COALESCE($7, phone),
        district = COALESCE($8, district),
        thana = COALESCE($9, thana),
        house = COALESCE($10, house),
        emergency_contact_name = COALESCE($11, emergency_contact_name),
        emergency_contact_phone = COALESCE($12, emergency_contact_phone),
        medical_history = COALESCE($13, medical_history),
        existing_conditions = COALESCE($14, existing_conditions),
        allergies = COALESCE($15, allergies),
        current_medications = COALESCE($16, current_medications),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $17
    RETURNING *
  `;
  const values = [
    name, photo, date_of_birth, gender, relationship, blood_group, phone,
    district, thana, house,
    emergency_contact_name, emergency_contact_phone, medical_history,
    existing_conditions, allergies, current_medications, id
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const deleteFamilyMember = async (id) => {
  const result = await pool.query(
    'DELETE FROM family_members WHERE id = $1 RETURNING *',
    [id]
  );
  return result.rows[0];
};

const findByUserIdAndId = async (user_id, id) => {
  const result = await pool.query(
    'SELECT * FROM family_members WHERE user_id = $1 AND id = $2',
    [user_id, id]
  );
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
