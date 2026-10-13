const pool = require('../db/pool');

async function createUser({ fullName, email, passwordHash, phone, role = 'client' }) {
  const [result] = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, phone, role)
     VALUES (:fullName, :email, :passwordHash, :phone, :role)`,
    { fullName, email, passwordHash, phone: phone || null, role }
  );
  return result.insertId;
}

async function findByEmail(email) {
  const [rows] = await pool.query('SELECT * FROM users WHERE email = :email', { email });
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT id, full_name, email, phone, role, created_at FROM users WHERE id = :id`,
    { id }
  );
  return rows[0] || null;
}

async function listUsers() {
  const [rows] = await pool.query(
    `SELECT id, full_name, email, phone, role, created_at FROM users ORDER BY id`
  );
  return rows;
}

module.exports = { createUser, findByEmail, findById, listUsers };
