const pool = require('../config/database');

// Corporate Account functions
const createCorporateAccount = async (accountData) => {
  const {
    company_name, company_address, contact_person, contact_email,
    contact_phone, tax_id, plan_type, monthly_allowance, contract_start_date, contract_end_date
  } = accountData;

  const query = `
    INSERT INTO corporate_accounts (
      company_name, company_address, contact_person, contact_email,
      contact_phone, tax_id, plan_type, monthly_allowance, contract_start_date, contract_end_date
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `;
  const values = [
    company_name, company_address, contact_person, contact_email,
    contact_phone, tax_id, plan_type, monthly_allowance, contract_start_date, contract_end_date
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const findCorporateAccountById = async (id) => {
  const query = 'SELECT * FROM corporate_accounts WHERE id = $1';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const findAllCorporateAccounts = async (filters = {}) => {
  let query = 'SELECT * FROM corporate_accounts WHERE 1=1';
  const values = [];
  let paramCount = 0;

  if (filters.status) {
    paramCount++;
    query += ` AND status = $${paramCount}`;
    values.push(filters.status);
  }

  if (filters.plan_type) {
    paramCount++;
    query += ` AND plan_type = $${paramCount}`;
    values.push(filters.plan_type);
  }

  query += ' ORDER BY created_at DESC';

  if (filters.limit) {
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    values.push(filters.limit);
  }

  const result = await pool.query(query, values);
  return result.rows;
};

const updateCorporateAccount = async (id, accountData) => {
  const {
    company_name, company_address, contact_person, contact_email,
    contact_phone, tax_id, plan_type, monthly_allowance, status
  } = accountData;

  const query = `
    UPDATE corporate_accounts 
    SET company_name = $1, company_address = $2, contact_person = $3,
        contact_email = $4, contact_phone = $5, tax_id = $6, plan_type = $7,
        monthly_allowance = $8, status = $9, updated_at = CURRENT_TIMESTAMP
    WHERE id = $10
    RETURNING *
  `;
  const values = [
    company_name, company_address, contact_person, contact_email,
    contact_phone, tax_id, plan_type, monthly_allowance, status, id
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const updateCorporateEmployeeCount = async (id, count) => {
  const query = `
    UPDATE corporate_accounts 
    SET employee_count = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [count, id]);
  return result.rows[0];
};

// Corporate Employee functions
const createCorporateEmployee = async (employeeData) => {
  const {
    corporate_account_id, user_id, employee_id, department, monthly_allowance
  } = employeeData;

  const query = `
    INSERT INTO corporate_employees (
      corporate_account_id, user_id, employee_id, department, monthly_allowance
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  const values = [
    corporate_account_id, user_id, employee_id, department, monthly_allowance
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const findCorporateEmployeeById = async (id) => {
  const query = `
    SELECT ce.*, ca.company_name, u.name as user_name, u.phone as user_phone
    FROM corporate_employees ce
    JOIN corporate_accounts ca ON ce.corporate_account_id = ca.id
    JOIN users u ON ce.user_id = u.id
    WHERE ce.id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const findCorporateEmployeeByUserId = async (user_id) => {
  const query = `
    SELECT ce.*, ca.company_name, ca.plan_type
    FROM corporate_employees ce
    JOIN corporate_accounts ca ON ce.corporate_account_id = ca.id
    WHERE ce.user_id = $1 AND ce.is_active = true
  `;
  const result = await pool.query(query, [user_id]);
  return result.rows[0];
};

const findCorporateEmployeesByAccountId = async (corporate_account_id, filters = {}) => {
  let query = `
    SELECT ce.*, u.name as user_name, u.phone as user_phone
    FROM corporate_employees ce
    JOIN users u ON ce.user_id = u.id
    WHERE ce.corporate_account_id = $1
  `;
  const values = [corporate_account_id];
  let paramCount = 1;

  if (filters.is_active !== undefined) {
    paramCount++;
    query += ` AND ce.is_active = $${paramCount}`;
    values.push(filters.is_active);
  }

  query += ' ORDER BY ce.created_at DESC';

  if (filters.limit) {
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    values.push(filters.limit);
  }

  const result = await pool.query(query, values);
  return result.rows;
};

const updateCorporateEmployee = async (id, employeeData) => {
  const { employee_id, department, monthly_allowance, is_active } = employeeData;

  const query = `
    UPDATE corporate_employees 
    SET employee_id = $1, department = $2, monthly_allowance = $3,
        is_active = $4, updated_at = CURRENT_TIMESTAMP
    WHERE id = $5
    RETURNING *
  `;
  const values = [employee_id, department, monthly_allowance, is_active, id];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const updateCorporateEmployeeUsedAllowance = async (id, amount) => {
  const query = `
    UPDATE corporate_employees 
    SET used_allowance = used_allowance + $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [amount, id]);
  return result.rows[0];
};

const resetCorporateEmployeeMonthlyAllowances = async (corporate_account_id) => {
  const query = `
    UPDATE corporate_employees 
    SET used_allowance = 0, updated_at = CURRENT_TIMESTAMP
    WHERE corporate_account_id = $1
    RETURNING *
  `;
  const result = await pool.query(query, [corporate_account_id]);
  return result.rows;
};

module.exports = {
  // Corporate Account
  createCorporateAccount,
  findCorporateAccountById,
  findAllCorporateAccounts,
  updateCorporateAccount,
  updateCorporateEmployeeCount,
  // Corporate Employee
  createCorporateEmployee,
  findCorporateEmployeeById,
  findCorporateEmployeeByUserId,
  findCorporateEmployeesByAccountId,
  updateCorporateEmployee,
  updateCorporateEmployeeUsedAllowance,
  resetCorporateEmployeeMonthlyAllowances
};
