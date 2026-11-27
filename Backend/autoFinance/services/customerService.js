import { pool } from "../config/db.js";

export async function createCustomer(data) {
  const customerCode = data.customerCode || `CUST-${Date.now()}`;
  
  const query = `
    INSERT INTO autofinance_customers (
      customer_code, first_name, last_name, phone, alternate_phone, 
      email, date_of_birth, gender, address, city, state, pincode
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *;
  `;
  
  const values = [
    customerCode,
    data.firstName,
    data.lastName,
    data.phone,
    data.alternatePhone,
    data.email,
    data.dateOfBirth,
    data.gender,
    data.address,
    data.city,
    data.state,
    data.pincode
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

export async function getAllCustomers() {
  const query = `
    SELECT * FROM autofinance_customers
    ORDER BY created_at DESC;
  `;
  const result = await pool.query(query);
  return result.rows;
}

export async function getCustomerById(id) {
  const query = `SELECT * FROM autofinance_customers WHERE id = $1`;
  const result = await pool.query(query, [id]);
  return result.rows[0];
}

export async function updateCustomer(id, data) {
  const firstName = data.firstName !== undefined ? data.firstName : data.first_name;
  const lastName = data.lastName !== undefined ? data.lastName : data.last_name;
  const phone = data.phone !== undefined ? data.phone : undefined;
  const alternatePhone = data.alternatePhone !== undefined ? data.alternatePhone : data.alternate_phone;
  const email = data.email !== undefined ? data.email : undefined;
  const dateOfBirth = data.dateOfBirth !== undefined ? data.dateOfBirth : data.date_of_birth;
  const gender = data.gender !== undefined ? data.gender : undefined;
  const address = data.address !== undefined ? data.address : undefined;
  const city = data.city !== undefined ? data.city : undefined;
  const state = data.state !== undefined ? data.state : undefined;
  const pincode = data.pincode !== undefined ? data.pincode : undefined;
  const notes = data.notes !== undefined ? data.notes : undefined;

  const query = `
    UPDATE autofinance_customers 
    SET 
      first_name = COALESCE($1, first_name),
      last_name = COALESCE($2, last_name),
      phone = COALESCE($3, phone),
      alternate_phone = COALESCE($4, alternate_phone),
      email = COALESCE($5, email),
      date_of_birth = COALESCE($6, date_of_birth),
      gender = COALESCE($7, gender),
      address = COALESCE($8, address),
      city = COALESCE($9, city),
      state = COALESCE($10, state),
      pincode = COALESCE($11, pincode),
      notes = COALESCE($12, notes),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $13
    RETURNING *;
  `;
  
  const values = [
    firstName,
    lastName,
    phone,
    alternatePhone,
    email,
    dateOfBirth,
    gender,
    address,
    city,
    state,
    pincode,
    notes,
    id
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}
