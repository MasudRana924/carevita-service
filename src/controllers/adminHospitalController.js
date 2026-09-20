const pool = require('../config/database');
const {
  findById: findHospitalById,
  updateHospital
} = require('../models/Hospital');
const { parsePagination } = require('../utils/pagination');

exports.createHospital = async (req, res) => {
  try {
    const { name, address, phone, email, location_lat, location_long, city, district, type, details } = req.body;
    if (!name) return res.error('Hospital name is required');

    const photoUrl = req.file ? req.file.path : null;
    const query = `
      INSERT INTO hospitals (name, address, phone, email, location_lat, location_long, city, district, type, photo, details)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    const result = await pool.query(query, [
      name, address, phone, email, location_lat, location_long, city, district, type, photoUrl, details
    ]);
    res.created(result.rows[0], 'Hospital created successfully');
  } catch (error) {
    console.error('Create hospital error:', error);
    res.serverError('Failed to create hospital');
  }
};

exports.getAllHospitals = async (req, res) => {
  try {
    const { district } = req.query;
    const { page, limit, offset } = parsePagination(req.query);
    let query = 'SELECT * FROM hospitals WHERE 1=1';
    const values = [];
    let paramCount = 0;

    if (district) {
      paramCount += 1;
      query += ` AND district = $${paramCount}`;
      values.push(district);
    }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)::int AS count');
    query += ` ORDER BY name LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    values.push(limit, offset);

    const [result, countResult] = await Promise.all([
      pool.query(query, values),
      pool.query(countQuery, values.slice(0, paramCount))
    ]);

    return res.paginated(result.rows, {
      page,
      limit,
      total: countResult.rows[0].count
    }, 'Hospitals fetched successfully');
  } catch (error) {
    console.error('Get hospitals error:', error);
    res.serverError('Failed to fetch hospitals');
  }
};

exports.updateHospital = async (req, res) => {
  try {
    const existing = await findHospitalById(req.params.id);
    if (!existing) return res.notFound('Hospital not found');

    const photo = req.file ? req.file.path : existing.photo;
    const updated = await updateHospital(req.params.id, {
      name: req.body.name ?? existing.name,
      address: req.body.address ?? existing.address,
      phone: req.body.phone ?? existing.phone,
      email: req.body.email ?? existing.email,
      location_lat: req.body.location_lat ?? existing.location_lat,
      location_long: req.body.location_long ?? existing.location_long,
      city: req.body.city ?? existing.city,
      district: req.body.district ?? existing.district,
      type: req.body.type ?? existing.type,
      is_active: req.body.is_active !== undefined ? req.body.is_active : existing.is_active
    });

    if (photo && photo !== existing.photo) {
      await pool.query('UPDATE hospitals SET photo = $1 WHERE id = $2', [photo, req.params.id]);
      updated.photo = photo;
    }

    res.success(updated, 'Hospital updated successfully');
  } catch (error) {
    console.error('Update hospital error:', error);
    res.serverError('Failed to update hospital');
  }
};

exports.updateHospitalStatus = async (req, res) => {
  try {
    const { is_active } = req.body;
    const result = await pool.query(
      'UPDATE hospitals SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [is_active, req.params.id]
    );
    if (!result.rows.length) return res.notFound('Hospital not found');
    res.success(result.rows[0], 'Hospital status updated');
  } catch (error) {
    console.error('Update hospital status error:', error);
    res.serverError('Failed to update hospital status');
  }
};
