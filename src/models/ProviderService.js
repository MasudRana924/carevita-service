const pool = require('../config/database');

const createProviderService = async (serviceData) => {
  const { provider_id, provider_type, service_id, custom_price } = serviceData;

  const query = `
    INSERT INTO provider_services (provider_id, provider_type, service_id, custom_price)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (provider_id, provider_type, service_id) 
    DO UPDATE SET custom_price = COALESCE($4, provider_services.custom_price), is_active = true, updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;
  const values = [provider_id, provider_type, service_id, custom_price];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const getProviderServices = async (provider_id, provider_type) => {
  const query = `
    SELECT ps.*, s.name as service_name, s.category, s.description, s.base_price, s.duration
    FROM provider_services ps
    JOIN services s ON ps.service_id = s.id
    WHERE ps.provider_id = $1 AND ps.provider_type = $2 AND ps.is_active = true
    ORDER BY s.name
  `;
  const result = await pool.query(query, [provider_id, provider_type]);
  return result.rows;
};

const updateProviderService = async (id, serviceData) => {
  const { custom_price, is_active } = serviceData;

  const query = `
    UPDATE provider_services
    SET custom_price = COALESCE($1, custom_price),
        is_active = COALESCE($2, is_active),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
    RETURNING *
  `;
  const values = [custom_price, is_active, id];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const deleteProviderService = async (id) => {
  const query = `
    UPDATE provider_services
    SET is_active = false, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const getServicesByProviderId = async (provider_id, provider_type) => {
  const query = `
    SELECT ps.*, s.name as service_name, s.category, s.base_price
    FROM provider_services ps
    JOIN services s ON ps.service_id = s.id
    WHERE ps.provider_id = $1 AND ps.provider_type = $2 AND ps.is_active = true
  `;
  const result = await pool.query(query, [provider_id, provider_type]);
  return result.rows;
};

module.exports = {
  createProviderService,
  getProviderServices,
  updateProviderService,
  deleteProviderService,
  getServicesByProviderId
};
