/**
 * Caregiver catalog rows are cached without contact or credential fields.
 * Those values are loaded from Postgres on a cache hit so the API response
 * stays the same and Redis never stores them.
 */

const pool = require('../config/database');

const PRIVATE_CAREGIVER_FIELDS = [
  'email',
  'phone',
  'emergency_contact',
  'address',
  'credential_number',
  'ekyc_reference_id',
  'user_ekyc_reference_id'
];

const stripCaregiverContacts = (row) => {
  if (!row || typeof row !== 'object') return row;
  const copy = { ...row };
  for (const field of PRIVATE_CAREGIVER_FIELDS) {
    delete copy[field];
  }
  return copy;
};

const stripCaregiverSearch = (result) => ({
  total: result?.total ?? 0,
  items: (result?.items || []).map(stripCaregiverContacts)
});

const loadCaregiverContacts = async (ids) => {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map();

  const result = await pool.query(
    `
    SELECT cp.id,
           u.email,
           u.phone,
           u.emergency_contact,
           u.address,
           u.ekyc_reference_id AS user_ekyc_reference_id,
           cp.credential_number,
           cp.ekyc_reference_id
    FROM caregiver_profiles cp
    JOIN users u ON u.id = cp.user_id
    WHERE cp.id = ANY($1::uuid[])
    `,
    [unique]
  );

  return new Map(result.rows.map((row) => {
    const contacts = { ...row };
    delete contacts.id;
    return [row.id, contacts];
  }));
};

const mergeContacts = (row, byId) => {
  if (!row) return row;
  const contacts = byId.get(row.id);
  if (!contacts) return row;
  return { ...row, ...contacts };
};

const hydrateCaregiverContacts = async (rowOrRows) => {
  const list = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
  const byId = await loadCaregiverContacts(list.map((row) => row && row.id));
  const merged = list.map((row) => mergeContacts(row, byId));
  return Array.isArray(rowOrRows) ? merged : merged[0];
};

const hydrateCaregiverSearch = async (cached) => ({
  total: cached?.total ?? 0,
  items: await hydrateCaregiverContacts(cached?.items || [])
});

module.exports = {
  PRIVATE_CAREGIVER_FIELDS,
  stripCaregiverContacts,
  stripCaregiverSearch,
  hydrateCaregiverContacts,
  hydrateCaregiverSearch
};
