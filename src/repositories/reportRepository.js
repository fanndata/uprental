const pool = require('../db/pool');

async function workloadReport({ from, to }) {
  const params = { from, to };

  const [[totals]] = await pool.query(
    `SELECT COUNT(*) AS total_rentals,
            COALESCE(SUM(total_price), 0) AS total_revenue,
            COALESCE(AVG(total_price), 0) AS avg_check
     FROM rentals
     WHERE created_at BETWEEN :from AND :to`,
    params
  );

  const [byStatus] = await pool.query(
    `SELECT status, COUNT(*) AS total
     FROM rentals
     WHERE created_at BETWEEN :from AND :to
     GROUP BY status`,
    params
  );

  const [byCategory] = await pool.query(
    `SELECT cat.name AS category, COUNT(*) AS total, COALESCE(SUM(r.total_price), 0) AS revenue
     FROM rentals r
     JOIN cars c ON c.id = r.car_id
     JOIN categories cat ON cat.id = c.category_id
     WHERE r.created_at BETWEEN :from AND :to
     GROUP BY cat.id, cat.name
     ORDER BY total DESC`,
    params
  );

  const [byMonth] = await pool.query(
    `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS total,
            COALESCE(SUM(total_price), 0) AS revenue
     FROM rentals
     WHERE created_at BETWEEN :from AND :to
     GROUP BY month
     ORDER BY month`,
    params
  );

  return { totals, byStatus, byCategory, byMonth };
}

async function performanceReport({ thresholdHours = 72 } = {}) {
  const [overall] = await pool.query(
    `SELECT COUNT(*) AS completed_count,
            COALESCE(AVG(TIMESTAMPDIFF(HOUR, created_at, completed_at)), 0) AS avg_hours
     FROM rentals
     WHERE status = 'completed' AND completed_at IS NOT NULL`
  );

  const [byCategory] = await pool.query(
    `SELECT cat.name AS category,
            COUNT(*) AS completed_count,
            COALESCE(AVG(TIMESTAMPDIFF(HOUR, r.created_at, r.completed_at)), 0) AS avg_hours
     FROM rentals r
     JOIN cars c ON c.id = r.car_id
     JOIN categories cat ON cat.id = c.category_id
     WHERE r.status = 'completed' AND r.completed_at IS NOT NULL
     GROUP BY cat.id, cat.name
     ORDER BY avg_hours DESC`
  );

  const [slow] = await pool.query(
    `SELECT r.id, r.created_at, r.completed_at,
            TIMESTAMPDIFF(HOUR, r.created_at, r.completed_at) AS hours,
            c.brand, c.model, u.full_name AS client_name
     FROM rentals r
     JOIN cars c ON c.id = r.car_id
     JOIN users u ON u.id = r.client_id
     WHERE r.status = 'completed'
       AND r.completed_at IS NOT NULL
       AND TIMESTAMPDIFF(HOUR, r.created_at, r.completed_at) > :thresholdHours
     ORDER BY hours DESC`,
    { thresholdHours: Number(thresholdHours) }
  );

  const [[activePending]] = await pool.query(
    `SELECT
       SUM(status = 'pending') AS pending_count,
       SUM(status = 'active') AS active_count
     FROM rentals`
  );

  return {
    overall: overall[0],
    byCategory,
    slowRentals: slow,
    queue: activePending,
    thresholdHours: Number(thresholdHours),
  };
}

module.exports = { workloadReport, performanceReport };
