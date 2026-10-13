const mysql = require('mysql2/promise');
const { getDbConfig } = require('./config');

const db = getDbConfig();

const pool = mysql.createPool({
  host: db.host,
  port: db.port,
  user: db.user,
  password: db.password,
  database: db.database,
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: 20000,
  namedPlaceholders: true,
});

module.exports = pool;
