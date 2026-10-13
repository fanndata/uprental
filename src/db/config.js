require('dotenv').config();

function envValue(...keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (value !== undefined && value !== '') return value;
  }
  return undefined;
}

function fromMysqlUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: Number(parsed.port || 3306),
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace(/^\//, ''),
    };
  } catch {
    return null;
  }
}

function getDbConfig() {
  const fromUrl = fromMysqlUrl(process.env.MYSQL_URL || process.env.DATABASE_URL);
  const password = process.env.DB_PASSWORD !== undefined && process.env.DB_PASSWORD !== ''
    ? process.env.DB_PASSWORD
    : (process.env.MYSQLPASSWORD || process.env.MYSQL_PASSWORD || (fromUrl && fromUrl.password) || '');

  return {
    host: envValue('DB_HOST', 'MYSQLHOST', 'MYSQL_HOST') || (fromUrl && fromUrl.host) || 'localhost',
    port: Number(envValue('DB_PORT', 'MYSQLPORT', 'MYSQL_PORT') || (fromUrl && fromUrl.port) || 3306),
    user: envValue('DB_USER', 'MYSQLUSER', 'MYSQL_USER') || (fromUrl && fromUrl.user) || 'root',
    password,
    database: envValue('DB_NAME', 'MYSQLDATABASE', 'MYSQL_DATABASE') || (fromUrl && fromUrl.database) || 'car_rental',
  };
}

function isLocalDb(config = getDbConfig()) {
  return config.host === 'localhost' || config.host === '127.0.0.1';
}

module.exports = { getDbConfig, isLocalDb };
