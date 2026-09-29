const pool = require('../config/database');
const { parsePagination } = require('../utils/pagination');
const { cachedHospitalList, cachedHospital } = require('../services/catalogCache');

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
    const listQuery = `${query} ORDER BY name LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;

    const { rows, total } = await cachedHospitalList({ district, page, limit }, async () => {
      const [result, countResult] = await Promise.all([
        pool.query(listQuery, [...values, limit, offset]),
        pool.query(countQuery, values)
      ]);
      return { rows: result.rows, total: countResult.rows[0].count };
    });

    return res.paginated(rows, {
      page,
      limit,
      total
    }, 'Hospitals fetched successfully');
  } catch (error) {
    console.error('List hospitals error:', error);
    return res.serverError('Failed to list hospitals');
  }
};

exports.getHospital = async (req, res) => {
  try {
    const { id } = req.params;
    const hospital = await cachedHospital(id, async () => {
      const result = await pool.query('SELECT * FROM hospitals WHERE id = $1', [id]);
      return result.rows[0] || null;
    });

    if (!hospital) {
      return res.notFound('Hospital not found');
    }

    return res.success(hospital, 'Hospital fetched successfully');
  } catch (error) {
    console.error('Get hospital error:', error);
    return res.serverError('Failed to get hospital');
  }
};
