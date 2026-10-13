const pool = require('../db/pool');

async function createCar(data) {
  const [result] = await pool.query(
    `INSERT INTO cars (category_id, brand, model, year, plate_number, color, daily_price, status, mileage)
     VALUES (:categoryId, :brand, :model, :year, :plateNumber, :color, :dailyPrice, :status, :mileage)`,
    {
      categoryId: data.categoryId,
      brand: data.brand,
      model: data.model,
      year: data.year,
      plateNumber: data.plateNumber,
      color: data.color,
      dailyPrice: data.dailyPrice,
      status: data.status || 'available',
      mileage: data.mileage || 0,
    }
  );
  return result.insertId;
}

async function getAll({ status, categoryId } = {}) {
  let sql = `
    SELECT c.*, cat.name AS category_name
    FROM cars c
    JOIN categories cat ON cat.id = c.category_id
    WHERE 1=1`;
  const params = {};
  if (status) {
    sql += ' AND c.status = :status';
    params.status = status;
  }
  if (categoryId) {
    sql += ' AND c.category_id = :categoryId';
    params.categoryId = categoryId;
  }
  sql += ' ORDER BY c.id';
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function getById(id) {
  const [rows] = await pool.query(
    `SELECT c.*, cat.name AS category_name
     FROM cars c
     JOIN categories cat ON cat.id = c.category_id
     WHERE c.id = :id`,
    { id }
  );
  return rows[0] || null;
}

async function updateCar(id, data) {
  const [result] = await pool.query(
    `UPDATE cars SET
      category_id = :categoryId,
      brand = :brand,
      model = :model,
      year = :year,
      plate_number = :plateNumber,
      color = :color,
      daily_price = :dailyPrice,
      status = :status,
      mileage = :mileage
     WHERE id = :id`,
    {
      id,
      categoryId: data.categoryId,
      brand: data.brand,
      model: data.model,
      year: data.year,
      plateNumber: data.plateNumber,
      color: data.color,
      dailyPrice: data.dailyPrice,
      status: data.status,
      mileage: data.mileage,
    }
  );
  return result.affectedRows > 0;
}

async function updateStatus(id, status) {
  const [result] = await pool.query('UPDATE cars SET status = :status WHERE id = :id', { id, status });
  return result.affectedRows > 0;
}

async function deleteCar(id) {
  const [result] = await pool.query('DELETE FROM cars WHERE id = :id', { id });
  return result.affectedRows > 0;
}

module.exports = { createCar, getAll, getById, updateCar, updateStatus, deleteCar };
