const pool = require('../config/database');
const { parsePagination } = require('../utils/pagination');

exports.listHospitals = async (req, res) => {
  try {
    const { district } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    let query = 'SELECT * FROM hospitals WHERE is_active = true';
    const values = [];
    let paramCount = 0;

    if (district) {
      paramCount++;
      query += ` AND district = $${paramCount}`;
      values.push(district);
    }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)::int AS count');
    query += ` ORDER BY name LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;

    const [result, countResult] = await Promise.all([
      pool.query(query, [...values, limit, offset]),
      pool.query(countQuery, values)
    ]);

    return res.paginated(result.rows, {
      page,
      limit,
      total: countResult.rows[0].count
    }, 'Hospitals fetched successfully');
  } catch (error) {
    console.error('List hospitals error:', error);
    return res.serverError('Failed to list hospitals');
  }
};

exports.getHospital = async (req, res) => {
  try {
    const { id } = req.params;
    const query = 'SELECT * FROM hospitals WHERE id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.notFound('Hospital not found');
    }

    return res.success(result.rows[0], 'Hospital fetched successfully');
  } catch (error) {
    console.error('Get hospital error:', error);
    return res.serverError('Failed to get hospital');
  }
};
