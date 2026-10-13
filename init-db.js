const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { getDbConfig, isLocalDb } = require('./src/db/config');
const { sqlForExistingDatabase } = require('./src/db/setup');

async function run() {
  const db = getDbConfig();
  let schema = fs.readFileSync(path.join(__dirname, 'sql', 'schema.sql'), 'utf8');
  let seed = fs.readFileSync(path.join(__dirname, 'sql', 'seed.sql'), 'utf8');

  const connection = await mysql.createConnection({
    host: db.host,
    port: db.port,
    user: db.user,
    password: db.password,
    ...(isLocalDb(db) ? {} : { database: db.database }),
    multipleStatements: true,
  });

  if (!isLocalDb(db)) {
    schema = sqlForExistingDatabase(schema);
    seed = sqlForExistingDatabase(seed);
  }

  console.log('Applying schema...');
  await connection.query(schema);
  console.log('Applying seed...');
  await connection.query(seed);
  await connection.end();
  console.log('Database car_rental ready.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
