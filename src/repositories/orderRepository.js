const pool = require('../db/pool');

async function createOrder(data) {
  const [result] = await pool.query(
    `INSERT INTO orders (car_id, client_id, manager_id, start_date, end_date, status, comment)
     VALUES (:carId, :clientId, :managerId, :startDate, :endDate, :status, :comment)`,
    {
      carId: data.carId,
      clientId: data.clientId,
      managerId: data.managerId || null,
      startDate: data.startDate,
      endDate: data.endDate,
      status: data.status || 'new',
      comment: data.comment || null,
    }
  );
  return result.insertId;
}

function buildListQuery({ status, clientId }) {
  let sql = `
    SELECT o.*,
           c.brand, c.model, c.plate_number,
           u.full_name AS client_name, u.email AS client_email,
           m.full_name AS manager_name
    FROM orders o
    JOIN cars c ON c.id = o.car_id
    JOIN users u ON u.id = o.client_id
    LEFT JOIN users m ON m.id = o.manager_id
    WHERE 1=1`;
  const params = {};
  if (status) {
    sql += ' AND o.status = :status';
    params.status = status;
  }
  if (clientId) {
    sql += ' AND o.client_id = :clientId';
    params.clientId = clientId;
  }
  sql += ' ORDER BY o.id DESC';
  return { sql, params };
}

async function getAll(filters = {}) {
  const { sql, params } = buildListQuery(filters);
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function getById(id) {
  const [rows] = await pool.query(
    `SELECT o.*,
            c.brand, c.model, c.plate_number, c.status AS car_status,
            u.full_name AS client_name, u.email AS client_email,
            m.full_name AS manager_name
     FROM orders o
     JOIN cars c ON c.id = o.car_id
     JOIN users u ON u.id = o.client_id
     LEFT JOIN users m ON m.id = o.manager_id
     WHERE o.id = :id`,
    { id }
  );
  return rows[0] || null;
}

async function updateOrder(id, data) {
  const [result] = await pool.query(
    `UPDATE orders SET
      status = :status,
      manager_id = :managerId,
      comment = :comment,
      processed_at = :processedAt
     WHERE id = :id`,
    {
      id,
      status: data.status,
      managerId: data.managerId || null,
      comment: data.comment || null,
      processedAt: data.processedAt || null,
    }
  );
  return result.affectedRows > 0;
}

async function deleteOrder(id) {
  const [result] = await pool.query('DELETE FROM orders WHERE id = :id', { id });
  return result.affectedRows > 0;
}

async function countActiveOverlap(carId, startDate, endDate, excludeId = null) {
  let sql = `
    SELECT COUNT(*) AS cnt
    FROM orders
    WHERE car_id = :carId
      AND status IN ('new', 'approved')
      AND start_date <= :endDate
      AND end_date >= :startDate`;
  const params = { carId, startDate, endDate };
  if (excludeId) {
    sql += ' AND id <> :excludeId';
    params.excludeId = excludeId;
  }
  const [rows] = await pool.query(sql, params);
  return Number(rows[0].cnt);
}

module.exports = {
  createOrder,
  getAll,
  getById,
  updateOrder,
  deleteOrder,
  countActiveOverlap,
};
