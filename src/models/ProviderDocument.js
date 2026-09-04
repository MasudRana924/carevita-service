const pool = require('../config/database');

const createProviderDocument = async (documentData) => {
  const { provider_id, provider_type, document_type, document_url } = documentData;
  
  const query = `
    INSERT INTO provider_documents (provider_id, provider_type, document_type, document_url)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const values = [provider_id, provider_type, document_type, document_url];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const getDocumentsByProvider = async (provider_id, provider_type) => {
  const query = 'SELECT * FROM provider_documents WHERE provider_id = $1 AND provider_type = $2 ORDER BY submitted_at DESC';
  const result = await pool.query(query, [provider_id, provider_type]);
  return result.rows;
};

const getDocumentById = async (id) => {
  const query = 'SELECT * FROM provider_documents WHERE id = $1';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const updateVerificationStatus = async (id, status, note) => {
  const query = `
    UPDATE provider_documents 
    SET verification_status = $1,
        verification_note = $2,
        verified_at = CASE WHEN $1 = 'APPROVED' THEN CURRENT_TIMESTAMP ELSE verified_at END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
    RETURNING *
  `;
  const values = [status, note, id];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const deleteDocument = async (id) => {
  const query = 'DELETE FROM provider_documents WHERE id = $1 RETURNING *';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

module.exports = {
  createProviderDocument,
  getDocumentsByProvider,
  getDocumentById,
  updateVerificationStatus,
  deleteDocument
};
