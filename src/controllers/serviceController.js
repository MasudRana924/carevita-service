const pool = require('../config/database');

exports.listHospitals = async (req, res) => {
  try {
    const { district, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM hospitals WHERE is_active = true';
    const values = [];
    let paramCount = 0;

    if (district) {
      paramCount++;
      query += ` AND district = $${paramCount}`;
      values.push(district);
    }

    query += ' ORDER BY name LIMIT $' + (paramCount + 1) + ' OFFSET $' + (paramCount + 2);
    values.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, values);

    res.success(result.rows, null, {
      page: parseInt(page),
      limit: parseInt(limit),
      total: result.rows.length
    });
  } catch (error) {
    console.error('List hospitals error:', error);
    res.serverError('Failed to list hospitals');
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

    res.success(result.rows[0]);
  } catch (error) {
    console.error('Get hospital error:', error);
    res.serverError('Failed to get hospital');
  }
};
