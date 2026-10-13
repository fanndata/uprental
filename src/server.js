const app = require('./app');
const pool = require('./db/pool');
const { getDbConfig, isLocalDb } = require('./db/config');
const { applySchemaAndSeed } = require('./db/setup');

const port = Number(process.env.PORT || 3000);

async function start() {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    if (!isLocalDb(getDbConfig())) {
      await applySchemaAndSeed();
    }
    app.listen(port, '0.0.0.0', () => {
      console.log(`Car Rental API слушает порт ${port}`);
    });
  } catch (err) {
    console.error('Не удалось подключиться к MySQL. Проверьте переменные базы и что СУБД запущена.');
    console.error(err.message);
    process.exit(1);
  }
}

start();
