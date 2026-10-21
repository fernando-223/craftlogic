const mysql = require('mysql2/promise');

const sslCa = process.env.DB_SSL_CA;

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'craftlogic',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'craftlogic',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
  timezone: 'Z',
  ...(sslCa ? { ssl: { ca: sslCa, rejectUnauthorized: true } } : {})
});

module.exports = pool;
