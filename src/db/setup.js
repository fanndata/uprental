const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { getDbConfig } = require('./config');

function sqlForExistingDatabase(sql) {
  return sql
    .replace(/CREATE DATABASE[\s\S]*?;/gi, '')
    .replace(/USE\s+car_rental\s*;/gi, '');
}

function readSql() {
  const root = path.join(__dirname, '..', '..');
  const schema = fs.readFileSync(path.join(root, 'sql', 'schema.sql'), 'utf8');
  const seed = fs.readFileSync(path.join(root, 'sql', 'seed.sql'), 'utf8');
  return {
    schema: sqlForExistingDatabase(schema),
    seed: sqlForExistingDatabase(seed),
  };
}

async function applySchemaAndSeed() {
  const db = getDbConfig();
  const connection = await mysql.createConnection({
    host: db.host,
    port: db.port,
    user: db.user,
    password: db.password,
    database: db.database,
    multipleStatements: true,
  });

  try {
    const [rows] = await connection.query("SHOW TABLES LIKE 'users'");
    if (rows.length > 0) return false;

    const { schema, seed } = readSql();
    console.log('Пустая база: создаю таблицы и тестовые данные...');
    await connection.query(schema);
    await connection.query(seed);
    console.log('База готова.');
    return true;
  } finally {
    await connection.end();
  }
}

module.exports = { sqlForExistingDatabase, applySchemaAndSeed };
