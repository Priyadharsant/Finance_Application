import { pool } from "../config/db.js";

export async function createLoanType(data) {
  const query = `
    INSERT INTO autofinance_loan_types (name, interest_type, category, base_interest_rate, default_tenure_months)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;
  const values = [
    data.name,
    data.interestType || 'FLAT', // FLAT, REDUCING
    data.category || 'VEHICLE',
    data.baseInterestRate || 0,
    data.defaultTenureMonths || 12
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

export async function getAllLoanTypes() {
  const result = await pool.query(`SELECT * FROM autofinance_loan_types ORDER BY created_at DESC;`);
  return result.rows;
}

export async function updateLoanType(id, data) {
  const query = `
    UPDATE autofinance_loan_types
    SET 
      name = COALESCE($1, name),
      interest_type = COALESCE($2, interest_type),
      category = COALESCE($3, category),
      base_interest_rate = COALESCE($4, base_interest_rate),
      default_tenure_months = COALESCE($5, default_tenure_months)
    WHERE id = $6
    RETURNING *;
  `;
  const values = [
    data.name,
    data.interestType,
    data.category,
    data.baseInterestRate,
    data.defaultTenureMonths,
    id
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

export async function deleteLoanType(id) {
  const query = `DELETE FROM autofinance_loan_types WHERE id = $1 RETURNING *;`;
  const result = await pool.query(query, [id]);
  return result.rows[0];
}
