const pool = require('../config/database');

const createAddress = async (addressData) => {
  const { address_line, city, district, division, latitude, longitude } = addressData;
  
  const query = `
    INSERT INTO addresses (address_line, city, district, division, latitude, longitude)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  const values = [address_line, city, district, division, latitude, longitude];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const getAddressById = async (id) => {
  const query = 'SELECT * FROM addresses WHERE id = $1';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const updateAddress = async (id, updateData) => {
  const { address_line, city, district, division, latitude, longitude } = updateData;
  
  const query = `
    UPDATE addresses 
    SET address_line = COALESCE($1, address_line),
        city = COALESCE($2, city),
        district = COALESCE($3, district),
        division = COALESCE($4, division),
        latitude = COALESCE($5, latitude),
        longitude = COALESCE($6, longitude),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $7
    RETURNING *
  `;
  const values = [address_line, city, district, division, latitude, longitude, id];

  const result = await pool.query(query, values);
  return result.rows[0];
};

module.exports = {
  createAddress,
  getAddressById,
  updateAddress
};
