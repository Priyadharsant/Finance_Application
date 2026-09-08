import { pool } from "../config/db.js";
import bcrypt from "bcrypt";

export async function loginUser(email, password) {
  const result = await pool.query(
    `
    SELECT id, name, email, phone, password_hash, role, is_active
    FROM autofinance_users
    WHERE email = $1
    `,
    [email]
  );

  if (result.rows.length === 0) {
    throw new Error("Invalid email or password");
  }

  const user = result.rows[0];

  if (!user.is_active) {
    throw new Error("User account is inactive");
  }

  const passwordMatched = await bcrypt.compare(
    password,
    user.password_hash
  );

  if (!passwordMatched) {
    throw new Error("Invalid email or password");
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
  };
}
