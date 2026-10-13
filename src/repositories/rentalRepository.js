const pool = require('../db/pool');

function buildListQuery({ status, clientId, from, to }) {
  let sql = `
    SELECT r.*,
           c.brand, c.model, c.plate_number, c.daily_price,
           u.full_name AS client_name, u.email AS client_email,
           m.full_name AS manager_name
    FROM rentals r
    JOIN cars c ON c.id = r.car_id
    JOIN users u ON u.id = r.client_id
    LEFT JOIN users m ON m.id = r.manager_id
    WHERE 1=1`;
  const params = {};
  if (status) {
    sql += ' AND r.status = :status';
    params.status = status;
  }
  if (clientId) {
    sql += ' AND r.client_id = :clientId';
    params.clientId = clientId;
  }
  if (from) {
    sql += ' AND r.created_at >= :from';
    params.from = from;
  }
  if (to) {
    sql += ' AND r.created_at <= :to';
    params.to = to;
  }
  sql += ' ORDER BY r.id DESC';
  return { sql, params };
}

async function createRental(data) {
  const [result] = await pool.query(
    `INSERT INTO rentals (car_id, client_id, manager_id, start_date, end_date, status, total_price, deposit)
     VALUES (:carId, :clientId, :managerId, :startDate, :endDate, :status, :totalPrice, :deposit)`,
    {
      carId: data.carId,
      clientId: data.clientId,
      managerId: data.managerId || null,
      startDate: data.startDate,
      endDate: data.endDate,
      status: data.status || 'pending',
      totalPrice: data.totalPrice,
      deposit: data.deposit || 0,
    }
  );
  return result.insertId;
}

async function getAll(filters = {}) {
  const { sql, params } = buildListQuery(filters);
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function getById(id) {
  const [rows] = await pool.query(
    `SELECT r.*,
            c.brand, c.model, c.plate_number, c.daily_price, c.status AS car_status,
            u.full_name AS client_name, u.email AS client_email,
            m.full_name AS manager_name
     FROM rentals r
     JOIN cars c ON c.id = r.car_id
     JOIN users u ON u.id = r.client_id
     LEFT JOIN users m ON m.id = r.manager_id
     WHERE r.id = :id`,
    { id }
  );
  return rows[0] || null;
}

async function updateRental(id, data) {
  const [result] = await pool.query(
    `UPDATE rentals SET
      car_id = :carId,
      start_date = :startDate,
      end_date = :endDate,
      status = :status,
      total_price = :totalPrice,
      deposit = :deposit,
      manager_id = :managerId,
      completed_at = :completedAt
     WHERE id = :id`,
    {
      id,
      carId: data.carId,
      startDate: data.startDate,
      endDate: data.endDate,
      status: data.status,
      totalPrice: data.totalPrice,
      deposit: data.deposit,
      managerId: data.managerId,
      completedAt: data.completedAt || null,
    }
  );
  return result.affectedRows > 0;
}

async function updateStatus(id, status, managerId = null) {
  const completedAt = status === 'completed' ? new Date() : null;
  const [result] = await pool.query(
    `UPDATE rentals SET status = :status,
      manager_id = COALESCE(:managerId, manager_id),
      completed_at = CASE WHEN :status = 'completed' THEN COALESCE(completed_at, NOW()) ELSE completed_at END
     WHERE id = :id`,
    { id, status, managerId }
  );
  return result.affectedRows > 0;
}

async function countDateOverlap(carId, startDate, endDate) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS cnt
     FROM rentals
     WHERE car_id = :carId
       AND status IN ('pending', 'active')
       AND start_date <= :endDate
       AND end_date >= :startDate`,
    { carId, startDate, endDate }
  );
  return Number(rows[0].cnt);
}

async function deleteRental(id) {
  const [result] = await pool.query('DELETE FROM rentals WHERE id = :id', { id });
  return result.affectedRows > 0;
}

async function addComment(rentalId, authorId, text) {
  const [result] = await pool.query(
    `INSERT INTO rental_comments (rental_id, author_id, text) VALUES (:rentalId, :authorId, :text)`,
    { rentalId, authorId, text }
  );
  return result.insertId;
}

async function getComments(rentalId) {
  const [rows] = await pool.query(
    `SELECT rc.*, u.full_name AS author_name, u.role AS author_role
     FROM rental_comments rc
     JOIN users u ON u.id = rc.author_id
     WHERE rc.rental_id = :rentalId
     ORDER BY rc.created_at`,
    { rentalId }
  );
  return rows;
}

module.exports = {
  createRental,
  getAll,
  getById,
  updateRental,
  updateStatus,
  countDateOverlap,
  deleteRental,
  addComment,
  getComments,
};
