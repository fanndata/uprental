const pool = require('../db/pool');

async function createCategory({ name, description }) {
  const [result] = await pool.query(
    `INSERT INTO categories (name, description) VALUES (:name, :description)`,
    { name, description: description || null }
  );
  return result.insertId;
}

async function getAll() {
  const [rows] = await pool.query('SELECT * FROM categories ORDER BY id');
  return rows;
}

async function getById(id) {
  const [rows] = await pool.query('SELECT * FROM categories WHERE id = :id', { id });
  return rows[0] || null;
}

async function updateCategory(id, { name, description }) {
  const [result] = await pool.query(
    `UPDATE categories SET name = :name, description = :description WHERE id = :id`,
    { id, name, description: description || null }
  );
  return result.affectedRows > 0;
}

async function deleteCategory(id) {
  const [result] = await pool.query('DELETE FROM categories WHERE id = :id', { id });
  return result.affectedRows > 0;
}

module.exports = { createCategory, getAll, getById, updateCategory, deleteCategory };
