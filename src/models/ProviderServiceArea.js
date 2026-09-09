const pool = require('../config/database');

const createProviderServiceArea = async (areaData) => {
  const { provider_id, provider_type, division, district, area, latitude, longitude, service_radius } = areaData;

  const query = `
    INSERT INTO provider_service_areas (provider_id, provider_type, division, district, area, latitude, longitude, service_radius)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;
  const values = [provider_id, provider_type, division, district, area, latitude, longitude, service_radius];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const getProviderServiceAreas = async (provider_id, provider_type) => {
  const query = `
    SELECT * FROM provider_service_areas
    WHERE provider_id = $1 AND provider_type = $2 AND is_active = true
    ORDER BY division, district, area
  `;
  const result = await pool.query(query, [provider_id, provider_type]);
  return result.rows;
};

const deleteProviderServiceArea = async (id) => {
  const query = `
    UPDATE provider_service_areas
    SET is_active = false, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const getProvidersByArea = async (district, area, provider_type) => {
  const query = `
    SELECT DISTINCT psa.provider_id, cp.id as profile_id, cp.rating, cp.hourly_rate, u.name, u.phone
    FROM provider_service_areas psa
    LEFT JOIN caregiver_profiles cp ON psa.provider_id = cp.id AND psa.provider_type = 'CAREGIVER'
    LEFT JOIN nurse_profiles np ON psa.provider_id = np.id AND psa.provider_type = 'NURSE'
    LEFT JOIN users u ON (cp.user_id = u.id OR np.user_id = u.id)
    WHERE psa.district = $1 AND psa.provider_type = $2 AND psa.is_active = true
  `;
  const result = await pool.query(query, [district, provider_type]);
  return result.rows;
};

module.exports = {
  createProviderServiceArea,
  getProviderServiceAreas,
  deleteProviderServiceArea,
  getProvidersByArea
};
